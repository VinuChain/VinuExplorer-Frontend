import React from 'react';

import type { AddressMetadataInfo } from 'types/api/addressMetadata';

import config from 'configs/app';
import * as advancedFilterMock from 'mocks/advancedFilter/advancedFilter';
import { test, expect } from 'playwright/lib';

import AdvancedFilter from './AdvancedFilter';

const labeledAddressHash = advancedFilterMock.baseResponse.items[0].from.hash.toLowerCase();
const metadataAddresses = Array.from(new Set(
  advancedFilterMock.baseResponse.items
    .flatMap((item) => [ item.from?.hash, item.to?.hash, item.created_contract?.hash ])
    .filter((hash): hash is string => Boolean(hash))
    .map((hash) => hash.toLowerCase()),
));

const metadataResponse: AddressMetadataInfo = {
  addresses: {
    [labeledAddressHash]: {
      reputation: null,
      tags: [
        {
          slug: 'vir-vinu-lp',
          name: 'VIR/VINU LP',
          tagType: 'liquidity_pool',
          ordinal: 0,
          meta: JSON.stringify({ tooltipDescription: 'VinuSwap VIR/VINU Liquidity Pool address.' }),
        },
      ],
    },
  },
};

test('base view +@dark-mode', async({ render, mockApiResponse, mockTextAd }) => {
  await mockTextAd();
  await mockApiResponse('general:advanced_filter', advancedFilterMock.baseResponse);
  await mockApiResponse('metadata:info', metadataResponse, {
    queryParams: {
      addresses: metadataAddresses,
      chainId: config.chain.id,
      tagsLimit: '20',
    },
  });
  await mockApiResponse('general:tokens', { items: [], next_page_params: null }, { queryParams: { limit: '7', q: '' } });
  await mockApiResponse('general:advanced_filter_methods', [], { queryParams: { q: '' } });

  const component = await render(<AdvancedFilter/>);

  await expect(component.getByRole('columnheader', { name: 'Label' })).toBeVisible();
  await expect(component.getByText('Liquidity Pool')).toBeVisible();
  await expect(component).toHaveScreenshot();
});
