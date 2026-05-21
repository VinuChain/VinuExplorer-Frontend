import { Box, Flex } from '@chakra-ui/react';
import React, { useCallback, useMemo, useState } from 'react';

import type { TokenInfo } from 'types/api/token';

import useAddressesMetadata from 'lib/address/useAddressesMetadata';
import getItemIndex from 'lib/getItemIndex';
import useIsMobile from 'lib/hooks/useIsMobile';
import useIsMounted from 'lib/hooks/useIsMounted';
import { Button } from 'toolkit/chakra/button';
import AddressCsvExportLink from 'ui/address/AddressCsvExportLink';
import ActionBar from 'ui/shared/ActionBar';
import DataFetchAlert from 'ui/shared/DataFetchAlert';
import DataListDisplay from 'ui/shared/DataListDisplay';
import Pagination from 'ui/shared/pagination/Pagination';
import type { QueryWithPagesResult } from 'ui/shared/pagination/useQueryWithPages';

import type { ChartPeriod } from './TokenHoldersChart';
import TokenHoldersChart, { DEFAULT_CHART_PERIOD } from './TokenHoldersChart';
import TokenHoldersConcentration from './TokenHoldersConcentration';
import TokenHoldersDistribution from './TokenHoldersDistribution';
import TokenHoldersList from './TokenHoldersList';
import TokenHoldersSummaryLine from './TokenHoldersSummaryLine';
import TokenHoldersTable from './TokenHoldersTable';

type AnalyticsTab = 'chart' | 'distribution';

const TABS_HEIGHT = 88;

// `getItemIndex`' default page size — used here for the rank-offset math.
// The backend `token_holders` endpoint pages at 50.
const HOLDERS_PAGE_SIZE = 50;

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
  // Lifted up from TokenHoldersChart so the CSV-export link below shares the
  // same selected period — otherwise the download window doesn't match what
  // the user is looking at on screen.
  const [ chartPeriod, setChartPeriod ] = useState<ChartPeriod>(DEFAULT_CHART_PERIOD);

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
  // 0-based offset to the first row on this page. Derived from the fixed
  // page size, NOT from `enrichedItems.length` — using the item count breaks
  // ranks on the last (short) page (e.g. 5 items on page 3 would otherwise
  // restart numbering from 11 instead of 101).
  const pageStartIndex = getItemIndex(0, pageNumber, HOLDERS_PAGE_SIZE) - 1;
  const loadedCount = pageStartIndex + (enrichedItems?.length ?? 0);

  const content = enrichedItems && token ? (
    <>
      <TokenHoldersConcentration hash={ token.address_hash }/>
      <TokenHoldersSummaryLine
        loadedCount={ loadedCount }
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
              params={{ type: 'holder-chart', period: chartPeriod }}
              isLoading={ holdersQuery.pagination.isLoading }
            />
          </Flex>
        </Flex>
        { activeChartTab === 'chart' &&
          <TokenHoldersChart hash={ token.address_hash } period={ chartPeriod } onChangePeriod={ setChartPeriod }/> }
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
