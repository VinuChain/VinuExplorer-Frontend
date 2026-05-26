import { Box } from '@chakra-ui/react';
import React from 'react';

import type { AddressMetadataInfo } from 'types/api/addressMetadata';

import config from 'configs/app';
import * as internalTxsMock from 'mocks/txs/internalTxs';
import { test, expect } from 'playwright/lib';

import AddressInternalTxs from './AddressInternalTxs';

const ADDRESS_HASH = internalTxsMock.base.from.hash;
const hooksConfig = {
  router: {
    query: { hash: ADDRESS_HASH },
  },
};
const metadataAddresses = Array.from(new Set(
  internalTxsMock.baseResponse.items
    .flatMap((item) => [ item.from.hash, item.to?.hash, item.created_contract?.hash ])
    .filter((hash): hash is string => Boolean(hash))
    .map((hash) => hash.toLowerCase()),
));
const metadataResponse: AddressMetadataInfo = {
  addresses: {
    [ADDRESS_HASH.toLowerCase()]: {
      reputation: null,
      tags: [
        {
          tagType: 'liquidity_pool',
          name: 'VIR/VINU LP',
          slug: 'vir-vinu-lp',
          ordinal: 0,
          meta: null,
        },
      ],
    },
  },
};

test('base view +@mobile', async({ render, mockApiResponse }) => {
  test.slow();
  await mockApiResponse('general:address_internal_txs', internalTxsMock.baseResponse, { pathParams: { hash: ADDRESS_HASH } });
  await mockApiResponse('metadata:info', metadataResponse, {
    queryParams: {
      addresses: metadataAddresses,
      chainId: config.chain.id,
      tagsLimit: '20',
    },
  });
  const component = await render(
    <Box pt={{ base: '134px', lg: 6 }}>
      <AddressInternalTxs/>
    </Box>,
    { hooksConfig },
  );
  await expect(component).toHaveScreenshot({ timeout: 10_000 });
});

test('hydrates address label tags', async({ render, mockApiResponse }) => {
  await mockApiResponse('general:address_internal_txs', internalTxsMock.baseResponse, { pathParams: { hash: ADDRESS_HASH } });
  await mockApiResponse('metadata:info', metadataResponse, {
    queryParams: {
      addresses: metadataAddresses,
      chainId: config.chain.id,
      tagsLimit: '20',
    },
  });
  const component = await render(
    <Box pt={{ base: '134px', lg: 6 }}>
      <AddressInternalTxs/>
    </Box>,
    { hooksConfig },
  );

  await expect(component.getByRole('link', { name: /Liquidity Pool/ }).first()).toBeVisible();
});
