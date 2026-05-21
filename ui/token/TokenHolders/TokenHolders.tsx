import { Box } from '@chakra-ui/react';
import React, { useMemo } from 'react';

import type { TokenInfo } from 'types/api/token';

import useAddressesMetadata from 'lib/address/useAddressesMetadata';
import useIsMobile from 'lib/hooks/useIsMobile';
import useIsMounted from 'lib/hooks/useIsMounted';
import AddressCsvExportLink from 'ui/address/AddressCsvExportLink';
import ActionBar from 'ui/shared/ActionBar';
import DataFetchAlert from 'ui/shared/DataFetchAlert';
import DataListDisplay from 'ui/shared/DataListDisplay';
import Pagination from 'ui/shared/pagination/Pagination';
import type { QueryWithPagesResult } from 'ui/shared/pagination/useQueryWithPages';

import TokenHoldersList from './TokenHoldersList';
import TokenHoldersTable from './TokenHoldersTable';

const TABS_HEIGHT = 88;

type Props = {
  token?: TokenInfo;
  holdersQuery: QueryWithPagesResult<'general:token_holders'>;
  shouldRender?: boolean;
  tabsHeight?: number;
};

const TokenHolders = ({ holdersQuery, token, shouldRender = true, tabsHeight = TABS_HEIGHT }: Props) => {
  const isMobile = useIsMobile();
  const isMounted = useIsMounted();

  const items = holdersQuery.data?.items;

  const hashesForMetadata = useMemo(
    () => (items ?? []).map((i) => i.address.hash),
    [ items ],
  );
  const { getMetadata } = useAddressesMetadata(hashesForMetadata);

  const enrichedItems = useMemo(() => {
    if (!items) return items;
    return items.map((i) => ({
      ...i,
      address: { ...i.address, metadata: getMetadata(i.address.hash) ?? i.address.metadata },
    }));
  }, [ items, getMetadata ]);

  if (!isMounted || !shouldRender) {
    return null;
  }

  if (holdersQuery.isError) {
    return <DataFetchAlert/>;
  }

  const actionBar = isMobile && holdersQuery.pagination.isVisible && (
    <ActionBar mt={ -6 }>
      { token && (
        <AddressCsvExportLink
          address={ token.address_hash }
          params={{ type: 'holders' }}
          isLoading={ holdersQuery.pagination.isLoading }
        />
      ) }
      <Pagination ml="auto" { ...holdersQuery.pagination }/>
    </ActionBar>
  );

  const pageNumber = holdersQuery.pagination.page ?? 1;
  const pageSize = enrichedItems?.length ?? 0;
  const pageStartIndex = (pageNumber - 1) * pageSize;

  const content = enrichedItems && token ? (
    <>
      <Box display={{ base: 'none', lg: 'block' }}>
        <TokenHoldersTable
          data={ enrichedItems }
          token={ token }
          top={ tabsHeight }
          isLoading={ holdersQuery.isPlaceholderData }
          pageStartIndex={ pageStartIndex }
        />
      </Box>
      <Box display={{ base: 'block', lg: 'none' }}>
        <TokenHoldersList
          data={ enrichedItems }
          token={ token }
          isLoading={ holdersQuery.isPlaceholderData }
          pageStartIndex={ pageStartIndex }
        />
      </Box>
    </>
  ) : null;

  return (
    <DataListDisplay
      isError={ holdersQuery.isError }
      itemsNum={ enrichedItems?.length }
      emptyText="There are no holders for this token."
      actionBar={ actionBar }
    >
      { content }
    </DataListDisplay>
  );
};

export default TokenHolders;
