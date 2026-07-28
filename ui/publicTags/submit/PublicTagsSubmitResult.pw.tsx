import type { FormSubmitResult } from './types';

import { expect, test, devices } from 'playwright/lib';

import * as mocks from './mocks';
import PublicTagsSubmitResult from './PublicTagsSubmitResult';
import PublicTagsSubmitResultRecovery from './PublicTagsSubmitResultRecovery.pwstory';

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

test('all success result view +@mobile', async({ render }) => {
  const component = await render(<PublicTagsSubmitResult data={ mocks.allSuccessResponses }/>);
  await expect(component).toHaveScreenshot();
});

test('result with errors view', async({ render }) => {
  const component = await render(<PublicTagsSubmitResult data={ mocks.mixedResponses }/>);
  await expect(component).toHaveScreenshot();
});

test('failed update Edit clears the result and preserves the immutable target query', async({ render }) => {
  const component = await render(<PublicTagsSubmitResultRecovery data={ failedUpdateResponse }/>);
  const editLink = component.getByRole('link', { name: 'Edit' });
  const preview = component.getByLabel('Requested visual changes');

  await expect(preview).toContainText('Requested changes for vir-official');
  await expect(preview).toContainText('Tooltip:');
  await expect(preview).toContainText('Hello, it is me');
  await expect(preview).not.toContainText('Background color:');
  await expect(editLink).toHaveAttribute(
    'href',
    '/public-tags/submit?submissionType=update&address=0x1234567890123456789012345678901234567890&tagLabel=vir-official&tagName=vir-official',
  );
  await editLink.evaluate((node) => {
    node.addEventListener('click', (event) => event.preventDefault(), { capture: true });
  });
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
