import React from 'react';

import type { FormSubmitResult } from './types';

import { expect, test, devices } from 'playwright/lib';

import * as mocks from './mocks';
import PublicTagsSubmitResult from './PublicTagsSubmitResult';

const failedUpdateResponse: FormSubmitResult = [ {
  status: 'error',
  error: 'Some error',
  payload: {
    ...mocks.mixedResponses[1].payload,
    address: '0x1234567890123456789012345678901234567890',
    name: 'vir-official',
    submissionType: 'update',
  },
} ];

const FailedUpdateRecoveryHarness = () => {
  const [ showResult, setShowResult ] = React.useState(true);
  const handleEditClick = React.useCallback(() => setShowResult(false), []);

  return showResult ? (
    <PublicTagsSubmitResult
      data={ failedUpdateResponse }
      onEditClick={ handleEditClick }
    />
  ) : (
    <div>Locked update form restored</div>
  );
};

test('all success result view +@mobile', async({ render }) => {
  const component = await render(<PublicTagsSubmitResult data={ mocks.allSuccessResponses }/>);
  await expect(component).toHaveScreenshot();
});

test('result with errors view', async({ render }) => {
  const component = await render(<PublicTagsSubmitResult data={ mocks.mixedResponses }/>);
  await expect(component).toHaveScreenshot();
});

test('failed update Edit clears the result and preserves the immutable target query', async({ render }) => {
  const component = await render(<FailedUpdateRecoveryHarness/>);
  const editLink = component.getByRole('link', { name: 'Edit' });

  await expect(editLink).toHaveAttribute(
    'href',
    '/public-tags/submit?submissionType=update&address=0x1234567890123456789012345678901234567890&tagLabel=vir-official&tagName=vir-official',
  );
  await editLink.click();
  await expect(component.getByText('Locked update form restored')).toBeVisible();
});

test.describe('mobile', () => {
  test.use({ viewport: devices['iPhone 13 Pro'].viewport });

  test('result with errors view', async({ render }) => {
    const component = await render(<PublicTagsSubmitResult data={ mocks.mixedResponses }/>);
    await expect(component).toHaveScreenshot();
  });
});
