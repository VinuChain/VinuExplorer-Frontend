import { Box } from '@chakra-ui/react';
import BigNumber from 'bignumber.js';
import React from 'react';

import type { AddressesItem } from 'types/api/addresses';

import useAddressesMetadata from 'lib/address/useAddressesMetadata';
import getItemIndex from 'lib/getItemIndex';
import { TOP_ADDRESS } from 'stubs/address';
import { generateListStub } from 'stubs/utils';
import AddressesListItem from 'ui/addresses/AddressesListItem';
import AddressesTable from 'ui/addresses/AddressesTable';
import ActionBar, { ACTION_BAR_HEIGHT_DESKTOP } from 'ui/shared/ActionBar';
import DataListDisplay from 'ui/shared/DataListDisplay';
import PageTitle from 'ui/shared/Page/PageTitle';
import Pagination from 'ui/shared/pagination/Pagination';
import useQueryWithPages from 'ui/shared/pagination/useQueryWithPages';

const Accounts = () => {
  const { isError, isPlaceholderData, data, pagination } = useQueryWithPages({
    resourceName: 'general:addresses',
    options: {
      placeholderData: generateListStub<'general:addresses'>(
        TOP_ADDRESS,
        50,
        {
          next_page_params: {
            fetched_coin_balance: '42',
            hash: '0x99f0ec06548b086e46cb0019c78d0b9b9f36cd53',
            items_count: 50,
          },
          total_supply: '0',
        },
      ),
    },
  });

  const actionBar = pagination.isVisible && (
    <ActionBar mt={ -6 }>
      <Pagination ml="auto" { ...pagination }/>
    </ActionBar>
  );

  const pageStartIndex = getItemIndex(0, pagination.page);
  const totalSupply = React.useMemo(() => {
    return BigNumber(data?.total_supply || '0');
  }, [ data?.total_supply ]);

  // /api/v2/addresses does not preload metadata.tags on the listing endpoint,
  // so batch-fetch them via /api/v1/metadata and merge into item.metadata so
  // the row components can render styled EntityTag badges (with bgColor /
  // textColor / icon from each tag's meta payload) the same way the
  // TokenHolders page does. `name`-type tags are stripped because
  // AddressEntity would otherwise replace the hex hash with the tag's name —
  // the /accounts list should keep showing the raw address.
  const hashesForMetadata = React.useMemo(
    () => (data?.items ?? []).map(i => i.hash),
    [ data?.items ],
  );
  const { getMetadata } = useAddressesMetadata(hashesForMetadata);

  const enrichedItems: Array<AddressesItem> | undefined = React.useMemo(() => {
    if (!data?.items) return undefined;
    return data.items.map(item => {
      const meta = getMetadata(item.hash);
      const labelTags = (meta?.tags ?? []).filter(t => t.tagType !== 'name');
      if (!labelTags.length) return item;
      const existing = (item.metadata?.tags ?? []).filter(t => t.tagType !== 'name');
      const existingSlugs = new Set(existing.map(t => t.slug));
      const mergedTags = [ ...existing, ...labelTags.filter(t => !existingSlugs.has(t.slug)) ];
      return {
        ...item,
        metadata: {
          reputation: item.metadata?.reputation ?? meta?.reputation ?? null,
          tags: mergedTags,
        },
      };
    });
  }, [ data?.items, getMetadata ]);

  const content = enrichedItems ? (
    <>
      <Box hideBelow="lg">
        <AddressesTable
          top={ pagination.isVisible ? ACTION_BAR_HEIGHT_DESKTOP : 0 }
          items={ enrichedItems }
          totalSupply={ totalSupply }
          pageStartIndex={ pageStartIndex }
          isLoading={ isPlaceholderData }
        />
      </Box>
      <Box hideFrom="lg">
        { enrichedItems.map((item, index) => {
          return (
            <AddressesListItem
              key={ item.hash + (isPlaceholderData ? index : '') }
              item={ item }
              index={ pageStartIndex + index }
              totalSupply={ totalSupply }
              isLoading={ isPlaceholderData }
            />
          );
        }) }
      </Box>
    </>
  ) : null;

  return (
    <>
      <PageTitle title="Top accounts" withTextAd/>
      <DataListDisplay
        isError={ isError }
        itemsNum={ data?.items.length }
        emptyText="There are no accounts."
        actionBar={ actionBar }
      >
        { content }
      </DataListDisplay>
    </>
  );
};

export default Accounts;
