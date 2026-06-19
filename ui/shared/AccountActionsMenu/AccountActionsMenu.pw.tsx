import type { BrowserContext, Locator } from '@playwright/test';
import React from 'react';

import config from 'configs/app';
import * as profileMock from 'mocks/user/profile';
import { contextWithAuth } from 'playwright/fixtures/auth';
import { test as base, expect } from 'playwright/lib';

import AccountActionsMenu from './AccountActionsMenu';

const ADDRESS_HASH = '0xb64a30399f7F6b0C154c2E7Af0a3ec7B0A5b131a';
const ESSENTIAL_DAPPS_CONFIG = JSON.stringify({
  revoke: { chains: [ config.chain.id ] },
});

const test = base.extend<{ context: BrowserContext }>({
  context: contextWithAuth,
});

const openMenuIfPresent = async(component: Locator) => {
  const menuButton = component.getByRole('button', { name: 'Show address menu' });
  if (await menuButton.count()) {
    await menuButton.click();
  }
};

test.describe('with multiple items', () => {
  const hooksConfig = {
    router: {
      query: { hash: '<hash>' },
      pathname: '/token/[hash]',
      isReady: true,
    },
  };

  test.beforeEach(async({ mockApiResponse }) => {
    mockApiResponse('general:user_info', profileMock.base);
  });

  test('base view', async({ render, page }) => {
    const component = await render(<AccountActionsMenu/>, { hooksConfig });
    await component.getByRole('button').click();

    await expect(page).toHaveScreenshot({ clip: { x: 0, y: 0, width: 200, height: 200 } });
  });

  test('base view with styles', async({ render, page }) => {
    const component = await render(<AccountActionsMenu m={ 2 } outline="1px solid lightpink"/>, { hooksConfig });
    await component.getByRole('button').click();

    await expect(page).toHaveScreenshot({ clip: { x: 0, y: 0, width: 200, height: 200 } });
  });

  test('loading', async({ render }) => {
    const component = await render(<AccountActionsMenu isLoading/>, { hooksConfig });

    await expect(component).toHaveScreenshot();
  });

  test('loading with styles', async({ render }) => {
    const component = await render(<AccountActionsMenu isLoading m={ 2 } outline="1px solid lightpink"/>, { hooksConfig });

    await expect(component).toHaveScreenshot();
  });
});

test.describe('with one item', () => {
  const hooksConfig = {
    router: {
      query: { hash: '<hash>' },
      pathname: '/tx/[hash]',
      isReady: true,
    },
  };

  test('base view', async({ render, page }) => {
    const component = await render(<AccountActionsMenu/>, { hooksConfig });
    await component.getByRole('button').hover();
    await expect(page.getByText('Add private tag')).toBeVisible();
    await expect(page).toHaveScreenshot({ clip: { x: 0, y: 0, width: 200, height: 200 } });
  });

  test('base view with styles', async({ render, page }) => {
    const component = await render(<AccountActionsMenu m={ 2 } outline="1px solid lightpink"/>, { hooksConfig });
    await component.getByRole('button').hover();
    await expect(page.getByText('Add private tag')).toBeVisible();
    await expect(page).toHaveScreenshot({ clip: { x: 0, y: 0, width: 200, height: 200 } });
  });

  test('loading', async({ render }) => {
    const component = await render(<AccountActionsMenu isLoading/>, { hooksConfig });

    await expect(component).toHaveScreenshot();
  });
});

test.describe('with revoke approvals action', () => {
  const addressHooksConfig = {
    router: {
      query: { hash: ADDRESS_HASH },
      pathname: '/address/[hash]',
      isReady: true,
    },
  };

  const tokenHooksConfig = {
    router: {
      query: { hash: ADDRESS_HASH },
      pathname: '/token/[hash]',
      isReady: true,
    },
  };

  const txHooksConfig = {
    router: {
      query: { hash: ADDRESS_HASH },
      pathname: '/tx/[hash]',
      isReady: true,
    },
  };

  test.beforeEach(async({ mockApiResponse }) => {
    mockApiResponse('general:user_info', profileMock.base);
  });

  test('shows check approvals on address pages when revoke is configured', async({ render, mockEnvs, page }) => {
    await mockEnvs([
      [ 'NEXT_PUBLIC_MARKETPLACE_ENABLED', 'true' ],
      [ 'NEXT_PUBLIC_MARKETPLACE_ESSENTIAL_DAPPS_CONFIG', ESSENTIAL_DAPPS_CONFIG ],
    ]);

    const component = await render(<AccountActionsMenu/>, { hooksConfig: addressHooksConfig });
    await component.getByRole('button', { name: 'Show address menu' }).click();

    const menuItem = page.getByRole('menuitem', { name: 'Check approvals' });

    await expect(menuItem).toBeVisible();
    await menuItem.click();
  });

  test('hides check approvals when revoke is not configured', async({ render, page }) => {
    const component = await render(<AccountActionsMenu/>, { hooksConfig: addressHooksConfig });
    await openMenuIfPresent(component);

    await expect(page.getByText('Check approvals')).toHaveCount(0);
  });

  test('hides check approvals on token pages', async({ render, mockEnvs, page }) => {
    await mockEnvs([
      [ 'NEXT_PUBLIC_MARKETPLACE_ENABLED', 'true' ],
      [ 'NEXT_PUBLIC_MARKETPLACE_ESSENTIAL_DAPPS_CONFIG', ESSENTIAL_DAPPS_CONFIG ],
    ]);

    const component = await render(<AccountActionsMenu/>, { hooksConfig: tokenHooksConfig });
    await openMenuIfPresent(component);

    await expect(page.getByText('Check approvals')).toHaveCount(0);
  });

  test('hides check approvals on transaction pages', async({ render, mockEnvs, page }) => {
    await mockEnvs([
      [ 'NEXT_PUBLIC_MARKETPLACE_ENABLED', 'true' ],
      [ 'NEXT_PUBLIC_MARKETPLACE_ESSENTIAL_DAPPS_CONFIG', ESSENTIAL_DAPPS_CONFIG ],
    ]);

    const component = await render(<AccountActionsMenu/>, { hooksConfig: txHooksConfig });
    await openMenuIfPresent(component);

    await expect(page.getByText('Check approvals')).toHaveCount(0);
  });
});
