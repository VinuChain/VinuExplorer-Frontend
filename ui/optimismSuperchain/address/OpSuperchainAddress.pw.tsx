import React from 'react';

import * as opSuperchainMock from 'mocks/multichain/opSuperchain';
import { ENVS_MAP } from 'playwright/fixtures/mockEnvs';
import { test, expect } from 'playwright/lib';
import * as pwConfig from 'playwright/utils/config';

import OpSuperchainAddress from './OpSuperchainAddress';

const CURRENT_ADDRESS = opSuperchainMock.addressA.hash;

const hooksConfig = {
  router: {
    query: { hash: CURRENT_ADDRESS },
  },
};

test('base view', async({ mockApiResponse, render, page, mockMultichainConfig, mockEnvs, mockAssetResponse, mockTextAd }) => {

  await mockMultichainConfig();
  await mockEnvs(ENVS_MAP.opSuperchain);
  await mockTextAd();

  await mockApiResponse('multichainAggregator:address', opSuperchainMock.addressA, { pathParams: { hash: CURRENT_ADDRESS } });
  await mockApiResponse('multichainAggregator:address_tokens', {
    items: [ opSuperchainMock.tokenA ],
    next_page_params: undefined,
  }, { pathParams: { hash: CURRENT_ADDRESS }, queryParams: { type: 'ERC-20' } });
  await mockApiResponse('multichainAggregator:address_tokens', {
    items: [ ],
    next_page_params: undefined,
  }, { pathParams: { hash: CURRENT_ADDRESS }, queryParams: { type: 'ERC-721' } });
  await mockApiResponse('multichainAggregator:address_tokens', {
    items: [ ],
    next_page_params: undefined,
  }, { pathParams: { hash: CURRENT_ADDRESS }, queryParams: { type: 'ERC-1155' } });
  await mockApiResponse('multichainAggregator:address_tokens', {
    items: [ ],
    next_page_params: undefined,
  }, { pathParams: { hash: CURRENT_ADDRESS }, queryParams: { type: 'ERC-404' } });

  await mockAssetResponse(opSuperchainMock.chainDataA.logo as string, './playwright/mocks/image_s.jpg');
  await mockAssetResponse(opSuperchainMock.chainDataB.logo as string, './playwright/mocks/image_md.jpg');

  const component = await render(
    <OpSuperchainAddress/>,
    { hooksConfig },
  );

  await expect(component).toHaveScreenshot({
    mask: [ page.locator(pwConfig.adsBannerSelector) ],
    maskColor: pwConfig.maskColor,
    // The ETH balance row's token icon resolves either to its fallback letter
    // avatar or to the loaded logo depending on timing, which moves ~117 px and
    // nothing else. It flipped this shot in four separate CI runs, in both
    // directions, with the baseline correct each time it was written. Tolerate
    // that much and no more: a real visual regression here moves thousands of
    // pixels, so this still fails on anything that matters.
    maxDiffPixels: 250,
  });

  await component.getByText('By chain').nth(0).click();
  await expect(page.locator('div[data-scope="popover"][data-part="content"]').nth(0)).toHaveScreenshot();

  await component.getByText('By chain').nth(1).click();
  await expect(page.locator('div[data-scope="popover"][data-part="content"]').nth(0)).toHaveScreenshot();
});
