import { Box } from '@chakra-ui/react';
import React from 'react';

import * as tokenInstanceMock from 'mocks/tokens/tokenInstance';
import * as tokenTransferMock from 'mocks/tokens/tokenTransfer';
import { test, expect } from 'playwright/lib';

import TokenTransferTable from './TokenTransferTable';

test.beforeEach(async({ page }) => {
  await page.route('https://raw.githubusercontent.com/VinuChain/vinuchain-lists/main/tokens/**', (route) => route.fulfill({
    status: 404,
    body: '',
  }));
});

const addressMetadata = {
  reputation: null,
  tags: [
    {
      tagType: 'liquidity_pool' as const,
      name: 'VIR/VINU LP',
      slug: 'vir-vinu-lp',
      ordinal: 0,
      meta: null,
    },
  ],
};

const mixTokensWithLabel = {
  ...tokenTransferMock.mixTokens,
  items: [
    {
      ...tokenTransferMock.erc20,
      from: {
        ...tokenTransferMock.erc20.from,
        metadata: addressMetadata,
      },
    },
    ...tokenTransferMock.mixTokens.items.slice(1),
  ],
};

test('without tx info', async({ render, mockAssetResponse }) => {
  await mockAssetResponse(tokenInstanceMock.base.image_url as string, './playwright/mocks/image_s.jpg');
  const component = await render(
    <Box pt={{ base: '134px', lg: 6 }}>
      <TokenTransferTable
        data={ mixTokensWithLabel.items }
        top={ 0 }
        showTxInfo={ false }
      />
    </Box>,
  );

  await expect(component.getByText('Liquidity Pool')).toBeVisible();
  await expect(component).toHaveScreenshot();
});

test('with tx info', async({ render, mockAssetResponse }) => {
  await mockAssetResponse(tokenInstanceMock.base.image_url as string, './playwright/mocks/image_s.jpg');
  const component = await render(
    <Box pt={{ base: '134px', lg: 6 }}>
      <TokenTransferTable
        data={ tokenTransferMock.mixTokens.items }
        top={ 0 }
        showTxInfo={ true }
      />
    </Box>,
  );

  await expect(component).toHaveScreenshot();
});
