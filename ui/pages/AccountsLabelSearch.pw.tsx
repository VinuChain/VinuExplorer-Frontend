import React from 'react';

import type { AddressesMetadataSearchResult } from 'types/api/addresses';
import type { AddressMetadataInfo } from 'types/api/addressMetadata';
import type { TokenLabelSearchResult } from 'types/api/token';

import config from 'configs/app';
import * as addressMocks from 'mocks/address/address';
import { tokenInfoERC20b } from 'mocks/tokens/tokenInfo';
import { test, expect } from 'playwright/lib';
import { CATEGORY_BROWSE_SLUG } from 'ui/shared/EntityTags/utils';

import AccountsLabelSearch from './AccountsLabelSearch';

const EXPECT_TIMEOUT = 15_000;

test.setTimeout(30_000);

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

const memeHooksConfig = {
  router: {
    query: {
      slug: CATEGORY_BROWSE_SLUG,
      tagType: 'meme',
      tagName: 'Meme',
    },
  },
};

const memeTokens: TokenLabelSearchResult = {
  items: [
    {
      ...tokenInfoERC20b,
      socials: { website: 'https://meme.example' },
      metadata: {
        tags: [
          {
            tagType: 'meme',
            name: 'Meme',
            slug: 'meme',
            ordinal: 0,
            meta: { tagUrl: 'https://meme.example' },
          },
        ],
      },
    },
  ],
  next_page_params: null,
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
  await expect(component).toHaveScreenshot({ timeout: EXPECT_TIMEOUT });
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

  await expect(component.getByRole('columnheader', { name: '#' })).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(component.getByText('VIR Ecosystem Wallet').first()).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(component.getByText('Project').first()).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(component.getByAltText('Project icon').first()).toBeVisible({ timeout: EXPECT_TIMEOUT });
});

test('renders meme label as token tracker table', async({ render, mockTextAd, mockApiResponse }) => {
  await mockTextAd();
  await mockApiResponse(
    'general:tokens_metadata_search',
    memeTokens,
    {
      queryParams: {
        tag_type: 'meme',
      },
    },
  );

  const component = await render(<AccountsLabelSearch/>, { hooksConfig: memeHooksConfig });

  await expect(component.getByRole('heading', { name: 'Token Tracker' })).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(component.getByRole('columnheader', { name: '#' })).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(component.getByRole('columnheader', { name: 'Contract Address' })).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(component.getByRole('columnheader', { name: 'Token Name' })).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(component.getByRole('columnheader', { name: 'Label' })).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(component.getByRole('columnheader', { name: 'Market Cap' })).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(component.getByRole('columnheader', { name: 'Holders' })).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(component.getByRole('link', { name: 'Meme' }).first()).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(component.getByRole('link', { name: 'meme.example' }).first()).toBeVisible({ timeout: EXPECT_TIMEOUT });
});
