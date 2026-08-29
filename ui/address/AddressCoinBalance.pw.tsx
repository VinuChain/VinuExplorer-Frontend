import React from 'react';

import * as balanceHistoryMock from 'mocks/address/coinBalanceHistory';
import { test, expect, devices } from 'playwright/lib';

import AddressCoinBalance from './AddressCoinBalance';

const addressHash = '0x1234';
const hooksConfig = {
  router: {
    query: { hash: addressHash },
  },
};

test('base view +@dark-mode', async({ render, mockApiResponse }) => {
  await mockApiResponse('general:address_coin_balance', balanceHistoryMock.baseResponse, { pathParams: { hash: addressHash } });
  await mockApiResponse('general:address_coin_balance_chart', balanceHistoryMock.chartResponse, {
    pathParams: { hash: addressHash },
    queryParams: { token_contract_address_hash: 'native' },
  });
  const component = await render(<AddressCoinBalance/>, { hooksConfig });
  await expect(component.getByText('Ether (ETH)').first()).toBeVisible();
  await expect(component.getByText('Balances')).toBeVisible();
  await expect(component).toHaveScreenshot();
});

test.describe('mobile', () => {
  test.use({ viewport: devices['iPhone 13 Pro'].viewport });

  test('base view', async({ render, mockApiResponse }) => {
    await mockApiResponse('general:address_coin_balance', balanceHistoryMock.baseResponse, { pathParams: { hash: addressHash } });
    await mockApiResponse('general:address_coin_balance_chart', balanceHistoryMock.chartResponse, {
      pathParams: { hash: addressHash },
      queryParams: { token_contract_address_hash: 'native' },
    });
    const component = await render(<AddressCoinBalance/>, { hooksConfig });
    await expect(component.getByText('Ether (ETH)').last()).toBeVisible();
    await expect(component).toHaveScreenshot();
  });
});
