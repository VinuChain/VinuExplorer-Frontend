import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findWorkflowBoundaryViolations,
  isWorkflowFile,
  loadWorkflowSources,
} from './verify-workflow-boundaries.mjs';

const cleanSources = () => loadWorkflowSources(process.cwd());
const workflow = (...lines) => `${ lines.join('\n') }\n`;
const withWorkflow = (name, source) => {
  const sources = cleanSources();
  sources.set(name, source);
  return sources;
};

test('current workflows satisfy the local defense-in-depth policy', () => {
  assert.deepEqual(findWorkflowBoundaryViolations(cleanSources()), []);
});

test('workflow boundary coverage includes both supported YAML extensions', () => {
  assert.equal(isWorkflowFile('release.yml'), true);
  assert.equal(isWorkflowFile('release.yaml'), true);
  assert.equal(isWorkflowFile('release.json'), false);
  assert.equal(isWorkflowFile('release.yml.disabled'), false);
});

test('rejects deletion of a required workflow', () => {
  const sources = cleanSources();
  sources.delete('cleanup.yml');
  assert.match(
    findWorkflowBoundaryViolations(sources).join('\n'),
    /required workflow cleanup\.yml is missing/,
  );
});

test('rejects CSV-separated mutable latest tags', () => {
  const sources = cleanSources();
  sources.set(
    'docker-publish.yml',
    `${ sources.get('docker-publish.yml') }\n# tags: ghcr.io/vinuchain/vinuexplorer-frontend:latest,ghcr.io/vinuchain/vinuexplorer-frontend:abc12345\n`,
  );
  assert.match(
    findWorkflowBoundaryViolations(sources).join('\n'),
    /mutable VinuExplorer latest image/,
  );
});

test('rejects shell-separated mutable latest tags', () => {
  const sources = cleanSources();
  sources.set(
    'docker-publish.yml',
    `${ sources.get('docker-publish.yml') }\n# docker push ghcr.io/vinuchain/vinuexplorer-frontend:latest; echo bypass\n`,
  );
  assert.match(
    findWorkflowBoundaryViolations(sources).join('\n'),
    /mutable VinuExplorer latest image/,
  );
});

test('rejects YAML merge keys before workflow interpretation', () => {
  const sources = withWorkflow(
    'merge-key.yaml',
    workflow(
      'name: Merge key bypass',
      'jobs:',
      '  deploy:',
      '    <<: { if: github.repository_owner == \'blockscout\' }',
      '    uses: blockscout/actions/.github/workflows/deploy.yaml@main',
    ),
  );
  assert.match(
    findWorkflowBoundaryViolations(sources).join('\n'),
    /merge-key\.yaml contains a forbidden YAML merge key/,
  );
});

test('rejects repo-local scripts in package-write workflows', () => {
  const sources = withWorkflow(
    'privileged-script.yaml',
    workflow(
      'name: Privileged script bypass',
      'permissions:',
      '  packages: write',
      'jobs:',
      '  publish:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: echo safe; ./scripts/push-release.sh',
    ),
  );
  assert.match(
    findWorkflowBoundaryViolations(sources).join('\n'),
    /privileged-script\.yaml uses repo-local executable indirection/,
  );
});

test('rejects package scripts and local actions in package-write workflows', () => {
  const sources = withWorkflow(
    'privileged-indirection.yaml',
    workflow(
      'name: Privileged indirection bypass',
      'permissions:',
      '  packages: write',
      'jobs:',
      '  publish:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: echo safe; yarn publish-image',
      '      - uses: ./actions/publish-image',
    ),
  );
  const violations = findWorkflowBoundaryViolations(sources).join('\n');
  assert.match(violations, /privileged-indirection\.yaml uses package-script indirection/);
  assert.match(violations, /privileged-indirection\.yaml uses a repo-local action/);
});

test('treats write-all workflows as privileged', () => {
  const sources = withWorkflow(
    'write-all.yaml',
    workflow(
      'name: Write all bypass',
      'permissions: write-all',
      'jobs:',
      '  publish:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: yarn publish-image',
    ),
  );
  assert.match(
    findWorkflowBoundaryViolations(sources).join('\n'),
    /write-all\.yaml uses package-script indirection/,
  );
});

test('rejects split Vinu image and raw latest metadata', () => {
  const sources = withWorkflow(
    'split-latest.yaml',
    workflow(
      'name: Split latest bypass',
      'jobs:',
      '  publish:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: docker/metadata-action@v5',
      '        with:',
      '          images: ghcr.io/vinuchain/vinuexplorer-frontend',
      '          tags: type=raw, value=latest',
    ),
  );
  assert.match(
    findWorkflowBoundaryViolations(sources).join('\n'),
    /split-latest\.yaml publishes the mutable VinuExplorer latest image/,
  );
});

test('propagates package authority through nested local reusable workflows', () => {
  const sources = cleanSources();
  sources.set(
    'privileged-caller.yml',
    workflow(
      'name: Privileged caller',
      'permissions:',
      '  packages: write',
      'jobs:',
      '  call:',
      '    uses: ./.github/workflows/middle.yml',
    ),
  );
  sources.set(
    'middle.yml',
    workflow(
      'name: Middle',
      'jobs:',
      '  call:',
      '    uses: ./.github/workflows/local-callee.yml',
    ),
  );
  sources.set(
    'local-callee.yml',
    workflow(
      'name: Local callee',
      'jobs:',
      '  publish:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: yarn publish-image',
    ),
  );
  assert.match(
    findWorkflowBoundaryViolations(sources).join('\n'),
    /local-callee\.yml uses package-script indirection/,
  );
});

test('rejects shell-wrapped repo-local scripts in privileged workflows', () => {
  const sources = withWorkflow(
    'wrapped-script.yaml',
    workflow(
      'name: Wrapped script bypass',
      'permissions:',
      '  packages: write',
      'jobs:',
      '  publish:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: bash -c \'./scripts/push-release.sh\'',
    ),
  );
  assert.match(
    findWorkflowBoundaryViolations(sources).join('\n'),
    /wrapped-script\.yaml uses repo-local executable indirection/,
  );
});

test('rejects backend dispatch authority in any workflow', () => {
  const sources = withWorkflow(
    'alternate-deploy.yaml',
    workflow(
      'name: Alternate deploy',
      'jobs:',
      '  deploy:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: gh workflow run deploy.yml --repo VinuChain/vinuexplorer-backend',
    ),
  );
  const result = findWorkflowBoundaryViolations(sources).join('\n');
  assert.match(result, /alternate-deploy\.yaml contains forbidden deployment authority/);
});

test('rejects variable-based GitHub workflow dispatches', () => {
  const sources = withWorkflow(
    'variable-dispatch.yaml',
    workflow(
      'name: Variable dispatch bypass',
      'jobs:',
      '  deploy:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: |',
      '          workflow=deploy.yml',
      '          repository="VinuChain/vinuexplorer-$(echo backend)"',
      '          gh workflow run "$workflow" --repo "$repository"',
    ),
  );
  assert.match(
    findWorkflowBoundaryViolations(sources).join('\n'),
    /variable-dispatch\.yaml contains forbidden deployment authority: GitHub workflow dispatch/,
  );
});

test('rejects additional pull_request_target workflows', () => {
  const sources = withWorkflow(
    'unsafe-target.yaml',
    workflow(
      'name: Unsafe target',
      'on: pull_request_target',
      'permissions:',
      '  contents: write',
      'jobs:',
      '  execute:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '        with:',
      '          ref: ${{ github.event.pull_request.head.sha }}',
      '      - run: ./pwn.sh',
    ),
  );
  assert.match(
    findWorkflowBoundaryViolations(sources).join('\n'),
    /unsafe-target\.yaml is not allowed to use pull_request_target/,
  );

  sources.set(
    'unsafe-target.yaml',
    workflow(
      'name: Unsafe quoted target',
      '"on": [push, pull_request_target]',
      'jobs:',
      '  execute:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: echo unsafe',
    ),
  );
  assert.match(
    findWorkflowBoundaryViolations(sources).join('\n'),
    /unsafe-target\.yaml is not allowed to use pull_request_target/,
  );

  sources.set(
    'unsafe-target.yaml',
    workflow(
      'name: Unsafe sequence target',
      'on:',
      '  - push',
      '  - pull_request_target',
      'jobs:',
      '  execute:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: echo unsafe',
    ),
  );
  assert.match(
    findWorkflowBoundaryViolations(sources).join('\n'),
    /unsafe-target\.yaml is not allowed to use pull_request_target/,
  );
});

test('rejects every mutable VinuExplorer frontend image alias', () => {
  const directAlias = withWorkflow(
    'mutable-main.yaml',
    workflow(
      'name: Mutable main alias',
      'jobs:',
      '  publish:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: docker push ghcr.io/vinuchain/vinuexplorer-frontend:main',
    ),
  );
  assert.match(
    findWorkflowBoundaryViolations(directAlias).join('\n'),
    /mutable-main\.yaml publishes a non-immutable VinuExplorer image tag/,
  );

  const branchMetadata = withWorkflow(
    'mutable-ref.yaml',
    workflow(
      'name: Mutable branch metadata',
      'jobs:',
      '  publish:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: docker/metadata-action@v5',
      '        with:',
      '          images: ghcr.io/vinuchain/vinuexplorer-frontend',
      '          tags: type=ref,event=branch',
    ),
  );
  assert.match(
    findWorkflowBoundaryViolations(branchMetadata).join('\n'),
    /mutable-ref\.yaml publishes a non-immutable VinuExplorer image tag/,
  );
});

test('rejects case-variant providers in unguarded jobs', () => {
  const sources = withWorkflow(
    'case-bypass.yaml',
    workflow(
      'name: Case bypass',
      'jobs:',
      '  deploy:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: Blockscout/actions/.github/actions/setup@main',
      '      - run: curl https://VAULT.k8s.blockscout.com',
    ),
  );
  assert.match(
    findWorkflowBoundaryViolations(sources).join('\n'),
    /case-bypass\.yaml job deploy references an upstream Blockscout provider without the owner guard/,
  );
});

test('rejects extra unguarded provider jobs in an allowlisted workflow', () => {
  const sources = cleanSources();
  sources.set(
    'cleanup.yml',
    `${ sources.get('cleanup.yml') }\n  bypass:\n    uses: blockscout/actions/.github/workflows/cleanup_helmfile.yaml@main\n`,
  );
  assert.match(
    findWorkflowBoundaryViolations(sources).join('\n'),
    /cleanup\.yml job bypass references an upstream Blockscout provider without the owner guard/,
  );
});

test('does not accept a fake job guard inside a block scalar', () => {
  const sources = withWorkflow(
    'fake-guard.yaml',
    workflow(
      'name: Fake guard',
      'jobs:',
      '  deploy:',
      '    runs-on: ubuntu-latest',
      '    env:',
      '      FAKE: |',
      '        deploy:',
      '          if: github.repository_owner == \'blockscout\'',
      '    steps:',
      '      - uses: blockscout/actions/.github/actions/setup@main',
    ),
  );
  assert.match(
    findWorkflowBoundaryViolations(sources).join('\n'),
    /fake-guard\.yaml job deploy references an upstream Blockscout provider without the owner guard/,
  );
});

test('accepts an actual upstream-owner job guard', () => {
  const sources = withWorkflow(
    'guarded.yaml',
    workflow(
      'name: Guarded',
      'jobs:',
      '  deploy:',
      '    if: github.repository_owner == \'blockscout\'',
      '    uses: blockscout/actions/.github/workflows/deploy.yaml@main',
    ),
  );
  assert.deepEqual(findWorkflowBoundaryViolations(sources), []);
});
