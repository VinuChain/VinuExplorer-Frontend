import React from 'react';

import { publicTagTypes as configMock } from 'mocks/metadata/publicTagTypes';
import { base as useInfoMock } from 'mocks/user/profile';
import { expect, test } from 'playwright/lib';

import * as mocks from './mocks';
import PublicTagsSubmitForm from './PublicTagsSubmitForm';

const onSubmitResult = () => {};
const EXPECT_TIMEOUT = 15_000;
const RECAPTCHA_INIT_ERROR = 'This feature is not available due to a reCAPTCHA initialization error';

test.setTimeout(30_000);

test('base view +@mobile', async({ page, render }) => {
  await page.evaluate((message) => {
    const hideWarning = () => {
      Array.from(document.querySelectorAll('body *')).forEach((element) => {
        const hasMessage = element.textContent?.includes(message);
        const childHasMessage = Array.from(element.children).some((child) => child.textContent?.includes(message));
        if (hasMessage && !childHasMessage) {
          const alertRoot = element.closest<HTMLElement>('[role="alert"], [data-part="root"]');
          const fallbackRoot = element.parentElement?.parentElement;
          (alertRoot ?? fallbackRoot ?? element as HTMLElement).style.display = 'none';
        }
      });
    };

    hideWarning();
    new MutationObserver(hideWarning).observe(document.body, { childList: true, subtree: true });
  }, RECAPTCHA_INIT_ERROR);

  const component = await render(
    <PublicTagsSubmitForm config={ configMock } onSubmitResult={ onSubmitResult } userInfo={ useInfoMock }/>,
  );

  await component.getByLabel(/Smart contract \/ Address/i).fill(mocks.address1);
  await component.getByRole('button', { name: 'Add item' }).first().click();

  await component.getByLabel('Tag (max 35 characters)*').fill(mocks.tag1.name);
  await component.getByLabel(/tag url/i).fill(mocks.tag1.meta.tagUrl);
  await component.getByLabel(/background \(hex\)/i).scrollIntoViewIfNeeded();
  await component.getByLabel(/background \(hex\)/i).fill(mocks.tag1.meta.bgColor);
  await component.getByLabel(/text \(hex\)/i).scrollIntoViewIfNeeded();
  await component.getByLabel(/text \(hex\)/i).fill(mocks.tag1.meta.textColor);

  await component.getByRole('button', { name: 'Add item' }).nth(1).click();
  await component.getByLabel(/connection/i).focus();
  await component.getByLabel(/connection/i).blur();

  await expect(component).toHaveScreenshot({ timeout: EXPECT_TIMEOUT });
});

test('requires ownership answer before submit', async({ render }) => {
  const component = await render(
    <PublicTagsSubmitForm
      config={ configMock }
      onSubmitResult={ onSubmitResult }
      userInfo={ useInfoMock }
    />,
  );

  await component.getByLabel(/Smart contract \/ Address/i).fill(mocks.address1);
  await component.getByLabel('Tag (max 35 characters)*').fill(mocks.tag1.name);
  await component.getByLabel(/connection/i).fill('Official meme token contract');
  await component.getByRole('button', { name: /send request/i }).click();

  await expect(component.getByText('Please answer the ownership question')).toBeVisible();
});

test('update mode locks one target and exposes only blank visual fields +@mobile', async({ render }) => {
  const component = await render(
    <PublicTagsSubmitForm
      config={ configMock }
      onSubmitResult={ onSubmitResult }
      userInfo={ useInfoMock }
    />,
    {
      hooksConfig: {
        router: {
          query: {
            submissionType: 'update',
            address: mocks.address1,
            tagLabel: 'vir-official',
            tagName: 'Vinu Republic',
          },
        },
      },
    },
  );

  const target = component.getByTestId('public-tag-update-target');
  await expect(target).toContainText('Vinu Republic');
  await expect(target).toContainText('vir-official');
  await expect(target).toContainText(mocks.address1);

  await expect(component.getByText(/Do you own this address/i)).toHaveCount(0);
  await expect(component.getByLabel(/Smart contract \/ Address/i)).toHaveCount(0);
  await expect(component.getByLabel('Tag (max 35 characters)*')).toHaveCount(0);
  await expect(component.getByLabel(/connection/i)).toHaveCount(0);
  await expect(component.getByRole('button', { name: 'Add item' })).toHaveCount(0);
  await expect(component.getByLabel(/Tag URL/i)).toHaveValue('');
  await expect(component.getByLabel(/Tag icon URL/i)).toHaveValue('');

  await component.getByRole('button', { name: 'Send update request' }).click();
  await expect(component.getByText(/Enter at least one visual change/i)).toBeVisible();
});

test('failed update retry restores in-memory values for the same locked target', async({ render }) => {
  const component = await render(
    <PublicTagsSubmitForm
      config={ configMock }
      onSubmitResult={ onSubmitResult }
      retrySubmission={{
        requesterName: 'Retry Person',
        requesterEmail: 'retry@example.com',
        companyName: 'Retry Co',
        companyWebsite: 'https://retry.example',
        address: mocks.address1,
        name: 'vir-official',
        submissionType: 'update',
        meta: {
          tagUrl: 'https://vir.example',
          tagIcon: 'https://vir.example/icon.png',
          bgColor: '#112233',
          textColor: '#fefefe',
          tooltipDescription: 'VIR retry',
        },
      }}
      userInfo={ useInfoMock }
    />,
    {
      hooksConfig: {
        router: {
          query: {
            submissionType: 'update',
            address: mocks.address1,
            tagLabel: 'vir-official',
            tagName: 'Vinu Republic',
          },
        },
      },
    },
  );

  await expect(component.getByRole('textbox', { name: 'Your name' })).toHaveValue('Retry Person');
  await expect(component.getByRole('textbox', { name: 'Email' })).toHaveValue('retry@example.com');
  await expect(component.getByRole('textbox', { name: 'Company name' })).toHaveValue('Retry Co');
  await expect(component.getByRole('textbox', { name: 'Company website' })).toHaveValue('https://retry.example');
  await expect(component.getByLabel(/Tag URL/i)).toHaveValue('https://vir.example');
  await expect(component.getByLabel(/Tag icon URL/i)).toHaveValue('https://vir.example/icon.png');
  await expect(component.getByLabel(/Background \(Hex\)/i)).toHaveValue('#112233');
  await expect(component.getByLabel(/Text \(Hex\)/i)).toHaveValue('#fefefe');
  await expect(component.getByLabel(/Tag description/i)).toHaveValue('VIR retry');
});
