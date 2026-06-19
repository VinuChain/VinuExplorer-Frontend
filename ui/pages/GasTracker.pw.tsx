import React from 'react';

import * as statsMock from 'mocks/stats/index';
import * as statsLineMock from 'mocks/stats/line';
import * as statsLinesMock from 'mocks/stats/lines';
import { test, expect } from 'playwright/lib';

import GasTracker from './GasTracker';

const statsWithPayback = {
  ...statsMock.base,
  coin_price: '2442.789',
  total_fee_refunded: '12500000000000000000000',
  feeless_tx_percentage: 73.4,
};

test.beforeEach(async({ mockTextAd }) => {
  await mockTextAd();
});

test('base view +@dark-mode +@mobile', async({ render, mockApiResponse, mockEnvs, page }) => {
  await mockEnvs([
    [ 'NEXT_PUBLIC_SEO_ENHANCED_DATA_ENABLED', 'true' ],
  ]);
  await mockApiResponse('general:stats', statsWithPayback);
  await mockApiResponse('stats:lines', statsLinesMock.base);
  const chartApiUrl = await mockApiResponse(
    'stats:line',
    statsLineMock.averageGasPrice,
    { pathParams: { id: 'averageGasPrice' }, queryParams: { from: '**' } },
  );
  const component = await render(<GasTracker/>);
  await page.waitForResponse(chartApiUrl);
  await page.waitForFunction(() => {
    return document.querySelector('path[data-name="chart-small"]')?.getAttribute('opacity') === '1';
  });
  await expect(component.getByText('Feeless transactions')).toBeVisible();
  await expect(component.getByText('73.4%')).toBeVisible();
  await expect(component.getByText('Total refunded')).toBeVisible();
  await expect(component.getByText(/Payback/).first()).toBeVisible();
  await expect(component).toHaveScreenshot();
});

test('shows feeless and Payback stats', async({ render, mockApiResponse, mockEnvs }) => {
  await mockEnvs([
    [ 'NEXT_PUBLIC_SEO_ENHANCED_DATA_ENABLED', 'true' ],
  ]);
  await mockApiResponse('general:stats', statsWithPayback);
  await mockApiResponse('stats:lines', statsLinesMock.base);
  await mockApiResponse(
    'stats:line',
    statsLineMock.averageGasPrice,
    { pathParams: { id: 'averageGasPrice' }, queryParams: { from: '**' } },
  );

  const component = await render(<GasTracker/>);

  await expect(component.getByText('Feeless transactions')).toBeVisible();
  await expect(component.getByText('73.4%')).toBeVisible();
  await expect(component.getByText('Total refunded')).toBeVisible();
  await expect(component.getByText(/Payback/).first()).toBeVisible();
});
