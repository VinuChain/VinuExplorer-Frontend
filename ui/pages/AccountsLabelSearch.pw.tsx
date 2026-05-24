import React from 'react';

import type { AddressesMetadataSearchResult } from 'types/api/addresses';
import type { AddressMetadataInfo } from 'types/api/addressMetadata';

import config from 'configs/app';
import * as addressMocks from 'mocks/address/address';
import { test, expect } from 'playwright/lib';

import AccountsLabelSearch from './AccountsLabelSearch';

const addresses: AddressesMetadataSearchResult = {
  items: [
    {
      ...addressMocks.withName,
      transactions_count: '1',
      coin_balance: '12345678901234567890000',
    },
    {
      ...addressMocks.token,
      transactions_count: '109123890123',
      coin_balance: '22222345678901234567890000',
      ens_domain_name: null,
    },
    {
      ...addressMocks.withoutName,
      transactions_count: '11',
      coin_balance: '1000000000000000000',
    },
    {
      ...addressMocks.eoa,
      transactions_count: '420',
      coin_balance: null,
    },
  ],
  next_page_params: null,
};

const hooksConfig = {
  router: {
    query: {
      slug: 'euler-finance-exploit',
      tagType: 'generic',
      tagName: 'Euler finance exploit',
    },
  },
};

const projectAddressHash = '0x4a1bd7925cec0a091457e8d6772d614e10069ffd';
const projectTagIcon = 'https://example.com/vir-ecosystem-wallet.png';

const projectHooksConfig = {
  router: {
    query: {
      slug: 'project',
      tagType: 'project',
      tagName: 'Project',
    },
  },
};

const projectAddresses: AddressesMetadataSearchResult = {
  items: [
    {
      ...addressMocks.withoutName,
      hash: projectAddressHash,
      transactions_count: '57',
      coin_balance: '792300249232584439998',
      metadata: {
        reputation: null,
        tags: [
          { tagType: 'project', name: 'Project', slug: 'project', ordinal: 0, meta: null },
        ],
      },
    },
  ],
  next_page_params: null,
};

const projectAddressMetadata: AddressMetadataInfo = {
  addresses: {
    [projectAddressHash]: {
      reputation: null,
      tags: [
        {
          tagType: 'name',
          name: 'VIR Ecosystem Wallet',
          slug: 'vir-ecosystem-wallet',
          ordinal: 0,
          meta: JSON.stringify({ tagIcon: projectTagIcon }),
        },
        { tagType: 'project', name: 'Project', slug: 'project', ordinal: 1, meta: null },
      ],
    },
  },
};

test('base view +@mobile', async({ render, mockTextAd, mockApiResponse }) => {
  await mockTextAd();
  await mockApiResponse(
    'general:addresses_metadata_search',
    addresses,
    {
      queryParams: {
        slug: 'euler-finance-exploit',
        tag_type: 'generic',
      },
    },
  );
  const component = await render(<AccountsLabelSearch/>, { hooksConfig });
  await expect(component).toHaveScreenshot();
});

test('hydrates public name tag and logo for category label results', async({ render, mockTextAd, mockApiResponse, mockAssetResponse }) => {
  await mockTextAd();
  await mockAssetResponse(projectTagIcon, './playwright/mocks/image_s.jpg');
  await mockApiResponse(
    'general:addresses_metadata_search',
    projectAddresses,
    {
      queryParams: {
        slug: 'project',
        tag_type: 'project',
      },
    },
  );
  await mockApiResponse('metadata:info', projectAddressMetadata, {
    queryParams: {
      addresses: [ projectAddressHash ],
      chainId: config.chain.id,
      tagsLimit: '20',
    },
  });

  const component = await render(<AccountsLabelSearch/>, { hooksConfig: projectHooksConfig });

  await expect(component.getByText('VIR Ecosystem Wallet').first()).toBeVisible();
  await expect(component.getByText('Project').first()).toBeVisible();
  await expect(component.getByAltText('Project icon').first()).toBeVisible();
});
