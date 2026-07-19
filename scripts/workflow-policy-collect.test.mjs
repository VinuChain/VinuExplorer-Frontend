import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { collectWorkflowPolicyInput } from './workflow-policy-collect.mjs';

const EVENT_HEAD = '1111111111111111111111111111111111111111';
const BASE_SHA = '2222222222222222222222222222222222222222';
const MERGE_SHA = '3333333333333333333333333333333333333333';
const PROTECTED = [
  '.github/workflows/workflow-boundary.yml',
  '.github/workflows/checks.yml',
  '.github/workflow-policy/verify.rb',
  '.github/workflow-policy/verify_test.rb',
  'scripts/workflow-policy-collect.mjs',
];

function harness(options = {}) {
  const failures = [];
  const outputs = {};
  let pullCalls = 0;
  const anchorShas = options.anchorShas || {};
  const github = {
    rest: {
      pulls: {
        async get() {
          pullCalls += 1;
          const mergeable = options.mergeableSequence ?
            options.mergeableSequence[
              Math.min(pullCalls - 1, options.mergeableSequence.length - 1)
            ] :
            true;
          return {
            data: {
              head: { sha: options.pullHead || EVENT_HEAD },
              base: { sha: options.pullBase || BASE_SHA },
              mergeable,
              merge_commit_sha: MERGE_SHA,
            },
          };
        },
      },
      git: {
        async getCommit() {
          return {
            data: {
              parents: (options.parents || [ BASE_SHA, EVENT_HEAD ])
                .map((sha) => ({ sha })),
            },
          };
        },
      },
      repos: {
        async getContent({ path: file, ref }) {
          if (PROTECTED.includes(file)) {
            return {
              data: {
                type: 'file',
                sha: anchorShas[`${ ref }:${ file }`] || `same-${ file }`,
                encoding: 'base64',
                content: Buffer.from('name: Checks\n').toString('base64'),
              },
            };
          }
          if (file === '.github/workflows') {
            return {
              data: [
                {
                  type: 'file',
                  name: 'checks.yml',
                  path: '.github/workflows/checks.yml',
                },
              ],
            };
          }
          if (file === '.github/workflows/checks.yml') {
            return {
              data: {
                type: 'file',
                encoding: 'base64',
                content: Buffer.from('name: Checks\n').toString('base64'),
              },
            };
          }
          throw new Error(`unexpected getContent ${ file }@${ ref }`);
        },
      },
    },
  };
  const context = {
    repo: { owner: 'VinuChain', repo: 'VinuExplorer-Frontend' },
    payload: {
      repository: { default_branch: 'main' },
      pull_request: {
        number: 47,
        head: { sha: EVENT_HEAD },
        base: {
          sha: BASE_SHA,
          ref: options.eventBaseRef || 'main',
        },
      },
    },
    runId: 123,
    runAttempt: 1,
  };
  const core = {
    setFailed(message) {
      failures.push(message);
    },
    setOutput(key, value) {
      outputs[key] = value;
    },
    info() {},
  };
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-policy-'));
  return {
    failures,
    outputs,
    get pullCalls() {
      return pullCalls;
    },
    cleanup() {
      fs.rmSync(temporary, { recursive: true, force: true });
    },
    invoke: () => collectWorkflowPolicyInput({
      github,
      context,
      core,
      fs,
      path,
      runnerTemp: temporary,
      sleep: async() => {},
    }),
  };
}

test('polls pending mergeability and binds the merge to the event head', async() => {
  const run = harness({ mergeableSequence: [ null, true ] });
  try {
    await run.invoke();
    assert.equal(run.pullCalls, 2);
    assert.deepEqual(run.failures, []);
    assert.ok(run.outputs.directory);
  } finally {
    run.cleanup();
  }
});

test('fails a stale pull-request head', async() => {
  const run = harness({ pullHead: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' });
  try {
    await run.invoke();
    assert.match(run.failures.join('\n'), /event head is stale/);
  } finally {
    run.cleanup();
  }
});

test('rejects pull requests targeting a non-default branch', async() => {
  const run = harness({ eventBaseRef: 'release' });
  try {
    await run.invoke();
    assert.match(run.failures.join('\n'), /only accepts the default branch/);
    assert.equal(run.pullCalls, 0);
  } finally {
    run.cleanup();
  }
});

test('fails a stale pull-request base', async() => {
  const run = harness({ pullBase: 'cccccccccccccccccccccccccccccccccccccccc' });
  try {
    await run.invoke();
    assert.match(run.failures.join('\n'), /event base is stale/);
  } finally {
    run.cleanup();
  }
});

test('fails a synthetic merge that is not parented by the event head', async() => {
  const run = harness({ parents: [ BASE_SHA, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' ] });
  try {
    await run.invoke();
    assert.match(run.failures.join('\n'), /does not contain the exact event head/);
  } finally {
    run.cleanup();
  }
});

test('compares protected paths directly without a capped changed-file list', async() => {
  const changed = PROTECTED[1];
  const run = harness({
    anchorShas: {
      [`${ BASE_SHA }:${ changed }`]: 'base-anchor',
      [`${ MERGE_SHA }:${ changed }`]: 'changed-anchor',
    },
  });
  try {
    await run.invoke();
    assert.match(run.failures.join('\n'), /default-branch trust anchor/);
  } finally {
    run.cleanup();
  }
});

test('protects the exact-head checks workflow as a trust anchor', async() => {
  const changed = '.github/workflows/checks.yml';
  const run = harness({
    anchorShas: {
      [`${ BASE_SHA }:${ changed }`]: 'base-checks',
      [`${ MERGE_SHA }:${ changed }`]: 'changed-checks',
    },
  });
  try {
    await run.invoke();
    assert.match(run.failures.join('\n'), /checks\.yml is a default-branch trust anchor/);
  } finally {
    run.cleanup();
  }
});
