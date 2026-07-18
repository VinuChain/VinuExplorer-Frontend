import assert from 'node:assert/strict';
import test from 'node:test';

import { isWorkflowFile } from './verify-workflow-boundaries.mjs';

test('workflow boundary coverage includes both supported YAML extensions', () => {
  assert.equal(isWorkflowFile('release.yml'), true);
  assert.equal(isWorkflowFile('release.yaml'), true);
  assert.equal(isWorkflowFile('release.json'), false);
  assert.equal(isWorkflowFile('release.yml.disabled'), false);
});
