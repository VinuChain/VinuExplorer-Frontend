import { Box, Flex } from '@chakra-ui/react';
import React, { useCallback, useMemo, useState } from 'react';

import type { TokenInfo } from 'types/api/token';

import useAddressesMetadata from 'lib/address/useAddressesMetadata';
import useIsMobile from 'lib/hooks/useIsMobile';
import useIsMounted from 'lib/hooks/useIsMounted';
import { Button } from 'toolkit/chakra/button';
import AddressCsvExportLink from 'ui/address/AddressCsvExportLink';
import ActionBar from 'ui/shared/ActionBar';
import DataFetchAlert from 'ui/shared/DataFetchAlert';
import DataListDisplay from 'ui/shared/DataListDisplay';
import Pagination from 'ui/shared/pagination/Pagination';
import type { QueryWithPagesResult } from 'ui/shared/pagination/useQueryWithPages';

import TokenHoldersChart from './TokenHoldersChart';
import TokenHoldersConcentration from './TokenHoldersConcentration';
import TokenHoldersDistribution from './TokenHoldersDistribution';
import TokenHoldersList from './TokenHoldersList';
import TokenHoldersSummaryLine from './TokenHoldersSummaryLine';
import TokenHoldersTable from './TokenHoldersTable';

type AnalyticsTab = 'chart' | 'distribution';

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
  const [ activeChartTab, setActiveChartTab ] = useState<AnalyticsTab>('chart');

  const handleSelectChartTab = useCallback(() => setActiveChartTab('chart'), []);
  const handleSelectDistributionTab = useCallback(() => setActiveChartTab('distribution'), []);

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
      <TokenHoldersConcentration hash={ token.address_hash }/>
      <TokenHoldersSummaryLine
        loadedCount={ enrichedItems.length }
        totalCount={ token.holders_count ? Number(token.holders_count) : undefined }
      />
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
      <Box mt={ 8 }>
        <Flex gap={ 2 } mb={ 3 } borderBottomWidth="1px" borderColor="border.divider" alignItems="center" flexWrap="wrap">
          <Button
            size="sm"
            variant={ activeChartTab === 'chart' ? 'solid' : 'ghost' }
            onClick={ handleSelectChartTab }
            aria-pressed={ activeChartTab === 'chart' }
          >
            Holder count over time
          </Button>
          <Button
            size="sm"
            variant={ activeChartTab === 'distribution' ? 'solid' : 'ghost' }
            onClick={ handleSelectDistributionTab }
            aria-pressed={ activeChartTab === 'distribution' }
          >
            Value distribution
          </Button>
          <Flex ml="auto" gap={ 2 } alignItems="center">
            <AddressCsvExportLink
              address={ token.address_hash }
              params={{ type: 'distribution' }}
              isLoading={ holdersQuery.pagination.isLoading }
            />
            <AddressCsvExportLink
              address={ token.address_hash }
              params={{ type: 'holder-chart', period: '30d' }}
              isLoading={ holdersQuery.pagination.isLoading }
            />
          </Flex>
        </Flex>
        { activeChartTab === 'chart' && <TokenHoldersChart hash={ token.address_hash }/> }
        { activeChartTab === 'distribution' && <TokenHoldersDistribution hash={ token.address_hash }/> }
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
