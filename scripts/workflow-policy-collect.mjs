const PROTECTED_POLICIES = [
  '.github/workflows/workflow-boundary.yml',
  '.github/workflow-policy/verify.rb',
  'scripts/workflow-policy-collect.mjs',
];
const MERGEABILITY_ATTEMPTS = 10;
const MERGEABILITY_DELAY_MS = 3000;

export async function collectWorkflowPolicyInput({
  github,
  context,
  core,
  fs,
  path,
  runnerTemp,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
}) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const pullNumber = context.payload.pull_request.number;
  const eventHead = context.payload.pull_request.head.sha;
  const eventBase = context.payload.pull_request.base.sha;
  const eventBaseRef = context.payload.pull_request.base.ref;
  const defaultBranch = context.payload.repository.default_branch;
  let pull;

  if (eventBaseRef !== defaultBranch) {
    core.setFailed(
      `Trusted policy only accepts the default branch ${ defaultBranch }; event targets ${ eventBaseRef }`,
    );
    return null;
  }

  for (let attempt = 1; attempt <= MERGEABILITY_ATTEMPTS; attempt += 1) {
    pull = await github.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });
    if (pull.data.head.sha !== eventHead) {
      core.setFailed(
        `The event head is stale: expected ${ eventHead }, current PR head is ${ pull.data.head.sha }`,
      );
      return null;
    }
    if (pull.data.base.sha !== eventBase) {
      core.setFailed(
        `The event base is stale: expected ${ eventBase }, current PR base is ${ pull.data.base.sha }`,
      );
      return null;
    }
    if (pull.data.mergeable !== null) break;
    if (attempt < MERGEABILITY_ATTEMPTS) await sleep(MERGEABILITY_DELAY_MS);
  }

  if (pull.data.mergeable === null) {
    core.setFailed('GitHub did not finish computing mergeability for the exact event head');
    return null;
  }
  if (pull.data.mergeable !== true) {
    core.setFailed('The exact event head is not mergeable with the current base branch');
    return null;
  }

  const mergeSha = pull.data.merge_commit_sha;
  if (!mergeSha) {
    core.setFailed('A current synthetic merge commit is required for workflow policy evaluation');
    return null;
  }
  const mergeCommit = await github.rest.git.getCommit({
    owner,
    repo,
    commit_sha: mergeSha,
  });
  const mergeParents = mergeCommit.data.parents.map((parent) => parent.sha);
  if (!mergeParents.includes(eventHead)) {
    core.setFailed(
      `Synthetic merge ${ mergeSha } does not contain the exact event head ${ eventHead }`,
    );
    return null;
  }
  if (!mergeParents.includes(eventBase)) {
    core.setFailed(
      `Synthetic merge ${ mergeSha } is not based on the exact event base ${ eventBase }`,
    );
    return null;
  }

  for (const protectedPath of PROTECTED_POLICIES) {
    let base;
    let candidate;
    try {
      [ base, candidate ] = await Promise.all([
        github.rest.repos.getContent({
          owner,
          repo,
          path: protectedPath,
          ref: eventBase,
        }),
        github.rest.repos.getContent({
          owner,
          repo,
          path: protectedPath,
          ref: mergeSha,
        }),
      ]);
    } catch (error) {
      core.setFailed(
        `${ protectedPath } must exist at both the immutable default branch and synthetic merge: ${ error.message }`,
      );
      return null;
    }
    if (
      Array.isArray(base.data) ||
      Array.isArray(candidate.data) ||
      base.data.type !== 'file' ||
      candidate.data.type !== 'file' ||
      base.data.sha !== candidate.data.sha
    ) {
      core.setFailed(
        `${ protectedPath } is a default-branch trust anchor and cannot be modified, deleted, or renamed by pull-request code`,
      );
      return null;
    }
  }

  const directory = await github.rest.repos.getContent({
    owner,
    repo,
    path: '.github/workflows',
    ref: mergeSha,
  });
  if (!Array.isArray(directory.data)) {
    core.setFailed('Expected .github/workflows to be a directory in the synthetic merge result');
    return null;
  }

  const outputDirectory = path.join(
    runnerTemp,
    `workflow-boundary-${ context.runId }-${ context.runAttempt }`,
  );
  fs.rmSync(outputDirectory, { recursive: true, force: true });
  fs.mkdirSync(outputDirectory, { recursive: true });

  const workflowFiles = directory.data.filter(
    (entry) => entry.type === 'file' && /\.(?:yml|yaml)$/.test(entry.name),
  );
  for (const entry of workflowFiles) {
    if (path.basename(entry.name) !== entry.name) {
      core.setFailed(`Unsafe workflow filename ${ entry.name }`);
      return null;
    }
    const response = await github.rest.repos.getContent({
      owner,
      repo,
      path: entry.path,
      ref: mergeSha,
    });
    if (Array.isArray(response.data) || response.data.type !== 'file') {
      core.setFailed(`Expected ${ entry.path } to be a file`);
      return null;
    }
    const source = Buffer.from(
      response.data.content,
      response.data.encoding,
    ).toString('utf8');
    fs.writeFileSync(path.join(outputDirectory, entry.name), source, {
      encoding: 'utf8',
      flag: 'wx',
    });
  }

  core.setOutput('directory', outputDirectory);
  core.info(
    `Collected ${ workflowFiles.length } workflow files from synthetic merge ${ mergeSha } for event head ${ eventHead }.`,
  );
  return { directory: outputDirectory, eventHead, mergeSha };
}

export { PROTECTED_POLICIES };
