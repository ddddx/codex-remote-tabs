import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApprovalDecisionResponse } from '../src/app/view-helpers.js';

test('buildApprovalDecisionResponse preserves structured approval decisions', () => {
  const decision = {
    acceptWithExecpolicyAmendment: {
      add: ['RemoteSigned'],
    },
  };

  assert.deepEqual(buildApprovalDecisionResponse(decision as any), decision);
});

test('buildApprovalDecisionResponse wraps string decisions for codex requests', () => {
  assert.deepEqual(buildApprovalDecisionResponse('accept'), { decision: 'accept' });
});
