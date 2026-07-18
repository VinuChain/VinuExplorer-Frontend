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
