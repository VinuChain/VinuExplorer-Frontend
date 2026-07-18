import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflows = path.join(root, '.github', 'workflows');
const read = (name) =>
  fs.readFileSync(path.join(workflows, name), 'utf8').replaceAll('\r\n', '\n');
const fail = (message) => {
  process.stderr.write(`Workflow boundary violation: ${ message }\n`);
  process.exitCode = 1;
};

const productionArtifact = read('docker-publish.yml');
for (const forbidden of [
  'Trigger backend deployment',
  'gh workflow run deploy.yml',
  'BACKEND_DEPLOY_TOKEN',
]) {
  if (productionArtifact.includes(forbidden)) {
    fail(
      `docker-publish.yml must publish an immutable image only; found ${ JSON.stringify(forbidden) }`,
    );
  }
}
if (
  /ghcr\.io\/vinuchain\/vinuexplorer-frontend:latest(?:\s|$)/.test(
    productionArtifact,
  )
) {
  fail(
    'docker-publish.yml must not publish the mutable latest image before a controller deployment permit',
  );
}

const upstreamOnlyJobs = {
  'cleanup.yml': [
    'cleanup_release',
    'cleanup_l2_release',
    'cleanup_docker_image',
  ],
  'deploy-main.yml': [ 'publish_image' ],
  'deploy-review.yml': [ 'make_slug', 'publish_image', 'deploy_review' ],
  'deploy-review-l2.yml': [ 'make_slug', 'publish_image', 'deploy_review_l2' ],
  'e2e-tests.yml': [ 'publish_image', 'deploy_e2e', 'test' ],
  'publish-image.yml': [ 'run' ],
};
const upstreamProviderPattern =
  /blockscout\/actions|vault\.k8s\.blockscout\.com|ghcr\.io\/blockscout/;

for (const [ file, jobs ] of Object.entries(upstreamOnlyJobs)) {
  const source = read(file);
  for (const job of jobs) {
    const guardedJob = new RegExp(
      `^([ \\t]+)${ job }:\\n\\1(?:  |    )if: github\\.repository_owner == 'blockscout'$`,
      'm',
    );
    if (!guardedJob.test(source))
      fail(
        `${ file } job ${ job } is not restricted to the upstream Blockscout owner`,
      );
  }
}

for (const file of fs
  .readdirSync(workflows)
  .filter((name) => name.endsWith('.yml'))) {
  const source = read(file);
  if (upstreamProviderPattern.test(source) && !(file in upstreamOnlyJobs)) {
    fail(
      `${ file } references an upstream Blockscout provider but is not in the explicit owner-gated allowlist`,
    );
  }
}

if (!process.exitCode)
  process.stdout.write(
    'Workflow provider and deployment boundaries are controller-safe.\n',
  );
