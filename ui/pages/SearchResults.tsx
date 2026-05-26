import { Box, chakra } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import type { FormEvent } from 'react';
import React from 'react';

import { SEARCH_RESULT_TYPES } from 'types/api/search';
import type { SearchResultItem } from 'types/client/search';

import config from 'configs/app';
import { useSettingsContext } from 'lib/contexts/settings';
import getQueryParamString from 'lib/router/getQueryParamString';
import removeQueryParam from 'lib/router/removeQueryParam';
import { Skeleton } from 'toolkit/chakra/skeleton';
import { TableBody, TableColumnHeaderSortable, TableHeaderSticky, TableRoot, TableRow } from 'toolkit/chakra/table';
import { ContentLoader } from 'toolkit/components/loaders/ContentLoader';
import * as regexp from 'toolkit/utils/regexp';
import useMarketplaceApps from 'ui/marketplace/useMarketplaceApps';
import SearchResultListItem from 'ui/searchResults/SearchResultListItem';
import SearchResultsInput from 'ui/searchResults/SearchResultsInput';
import SearchResultTableItem from 'ui/searchResults/SearchResultTableItem';
import ActionBar, { ACTION_BAR_HEIGHT_DESKTOP } from 'ui/shared/ActionBar';
import AppErrorBoundary from 'ui/shared/AppError/AppErrorBoundary';
import DataFetchAlert from 'ui/shared/DataFetchAlert';
import * as Layout from 'ui/shared/layout/components';
import PageTitle from 'ui/shared/Page/PageTitle';
import Pagination from 'ui/shared/pagination/Pagination';
import ExternalSearchItem from 'ui/shared/search/ExternalSearchItem';
import type { SearchResultAppItem } from 'ui/shared/search/utils';
import { getItemCategory, searchItemTitles } from 'ui/shared/search/utils';
import HeaderAlert from 'ui/snippets/header/HeaderAlert';
import HeaderDesktop from 'ui/snippets/header/HeaderDesktop';
import HeaderMobile from 'ui/snippets/header/HeaderMobile';
import SearchBarSuggestBlockCountdown from 'ui/snippets/searchBar/SearchBarSuggest/SearchBarSuggestBlockCountdown';
import useSearchQuery from 'ui/snippets/searchBar/useSearchQuery';

const nameServicesFeature = config.features.nameServices;

type SearchResultsSortField = 'rank' | 'result' | 'details' | 'value' | 'category';
type SearchResultsSortDirection = 'asc' | 'desc';
type SearchResultRow = {
  item: SearchResultItem | SearchResultAppItem;
  rank: number;
};

function getTimestampValue(timestamp?: string | null) {
  if (!timestamp) {
    return null;
  }

  const value = Date.parse(timestamp);
  return Number.isNaN(value) ? null : value;
}

function getSearchResultTextValue(item: SearchResultItem | SearchResultAppItem, field: SearchResultsSortField, rank: number): string | number | null {
  if (field === 'rank') {
    return rank;
  }

  if (field === 'category') {
    const category = getItemCategory(item);
    return category ? searchItemTitles[category].itemTitle : '';
  }

  switch (item.type) {
    case 'token': {
      if (field === 'result') return `${ item.name ?? '' } ${ item.symbol ?? '' }`;
      if (field === 'details') return item.address_hash;
      return item.token_type === 'ERC-20' ? Number(item.exchange_rate ?? 0) : Number(item.total_supply ?? 0);
    }
    case 'metadata_tag':
    case 'contract':
    case 'address': {
      if (field === 'result') return item.name || item.ens_info?.name || item.address_hash;
      if (field === 'details') return item.address_hash;
      return item.is_smart_contract_verified ? 1 : 0;
    }
    case 'label': {
      if (field === 'result') return item.name;
      if (field === 'details') return item.address_hash;
      return item.is_smart_contract_verified ? 1 : 0;
    }
    case 'app': {
      if (field === 'result') return item.app.title;
      if (field === 'details') return item.app.description;
      return item.app.id;
    }
    case 'block': {
      if (field === 'result') return Number(item.block_number);
      if (field === 'details') return item.block_hash;
      return getTimestampValue(item.timestamp);
    }
    case 'transaction': {
      if (field === 'result' || field === 'details') return item.transaction_hash;
      return getTimestampValue(item.timestamp);
    }
    case 'zetaChainCCTX': {
      if (field === 'result' || field === 'details') return item.cctx.index;
      return Number(item.cctx.last_update_timestamp || 0);
    }
    case 'tac_operation': {
      if (field === 'result') return item.tac_operation.operation_id;
      if (field === 'details') return item.tac_operation.type;
      return getTimestampValue(item.tac_operation.timestamp);
    }
    case 'blob': {
      return item.blob_hash;
    }
    case 'user_operation': {
      if (field === 'result' || field === 'details') return item.user_operation_hash;
      return getTimestampValue(item.timestamp);
    }
    case 'ens_domain': {
      if (field === 'result') return item.ens_info.name;
      if (field === 'details') return item.address_hash;
      return getTimestampValue(item.ens_info.expiry_date);
    }
    case 'cluster': {
      if (field === 'result') return item.cluster_info.name;
      if (field === 'details') return item.cluster_info.owner;
      return getTimestampValue(item.cluster_info.created_at);
    }
  }

  return null;
}

function compareSearchResultRows(a: SearchResultRow, b: SearchResultRow, field: SearchResultsSortField) {
  const aValue = getSearchResultTextValue(a.item, field, a.rank);
  const bValue = getSearchResultTextValue(b.item, field, b.rank);

  if (aValue === bValue) {
    return a.rank - b.rank;
  }

  if (aValue === null || aValue === undefined || aValue === '') {
    return 1;
  }

  if (bValue === null || bValue === undefined || bValue === '') {
    return -1;
  }

  if (typeof aValue === 'number' && typeof bValue === 'number') {
    return aValue - bValue;
  }

  return String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' });
}

const SearchResultsPageContent = () => {
  const router = useRouter();
  const withRedirectCheck = getQueryParamString(router.query.redirect) === 'true';
  const {
    query,
    redirectCheckQuery,
    searchTerm,
    debouncedSearchTerm,
    handleSearchTermChange,
    zetaChainCCTXQuery,
    externalSearchItem,
  } = useSearchQuery(withRedirectCheck);
  const { data, isError, isPlaceholderData, pagination } = query;
  const [ showContent, setShowContent ] = React.useState(!withRedirectCheck);
  const [ sort, setSort ] = React.useState<{ field: SearchResultsSortField; direction: SearchResultsSortDirection }>({
    field: 'rank',
    direction: 'asc',
  });

  const marketplaceApps = useMarketplaceApps(debouncedSearchTerm);
  const settingsContext = useSettingsContext();

  const handleNavigateToResults = React.useCallback((searchTerm: string) => {
    handleSearchTermChange(searchTerm);
  }, [ handleSearchTermChange ]);

  React.useEffect(() => {
    if (showContent) {
      return;
    }

    if (!debouncedSearchTerm) {
      setShowContent(true);
      return;
    }

    if (redirectCheckQuery.data?.redirect && redirectCheckQuery.data.parameter) {
      switch (redirectCheckQuery.data.type) {
        case 'block': {
          router.replace({ pathname: '/block/[height_or_hash]', query: { height_or_hash: redirectCheckQuery.data.parameter } });
          return;
        }
        case 'address': {
          router.replace({ pathname: '/address/[hash]', query: { hash: redirectCheckQuery.data.parameter } });
          return;
        }
        case 'transaction': {
          router.replace({ pathname: '/tx/[hash]', query: { hash: redirectCheckQuery.data.parameter } });
          return;
        }
        case 'user_operation': {
          if (config.features.userOps.isEnabled) {
            router.replace({ pathname: '/op/[hash]', query: { hash: redirectCheckQuery.data.parameter } });
            return;
          }
          break;
        }
        case 'blob': {
          if (config.features.dataAvailability.isEnabled) {
            router.replace({ pathname: '/blobs/[hash]', query: { hash: redirectCheckQuery.data.parameter } });
            return;
          }
          break;
        }
      }
    }

    if (!redirectCheckQuery.isPending) {
      setShowContent(true);
      removeQueryParam(router, 'redirect');
    }
  }, [ redirectCheckQuery, router, debouncedSearchTerm, showContent ]);

  const handleSubmit = React.useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  }, [ ]);

  const isLoading = marketplaceApps.isPlaceholderData || isPlaceholderData;
  const sortValue = `${ sort.field }_${ sort.direction }`;

  const handleSortToggle = React.useCallback((field: SearchResultsSortField) => {
    setSort((current) => ({
      field,
      direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const displayedItems: Array<SearchResultItem | SearchResultAppItem> = React.useMemo(() => {
    const apiData = (data?.items || []).filter((item) => {
      if (!SEARCH_RESULT_TYPES[item.type]) {
        return false;
      }
      if (!config.features.userOps.isEnabled && item.type === 'user_operation') {
        return false;
      }
      if (!config.features.dataAvailability.isEnabled && item.type === 'blob') {
        return false;
      }
      if ((!nameServicesFeature.isEnabled || !nameServicesFeature.ens.isEnabled) && item.type === 'ens_domain') {
        return false;
      }
      if (!config.features.tac.isEnabled && item.type === 'tac_operation') {
        return false;
      }
      return true;
    });

    const futureBlockItem = !isPlaceholderData &&
      pagination.page === 1 &&
      !data?.next_page_params &&
      apiData.length > 0 &&
      !apiData.some(({ type }) => type === 'block') &&
      regexp.BLOCK_HEIGHT.test(debouncedSearchTerm) ?
      {
        type: 'block' as const,
        block_type: 'block' as const,
        block_number: debouncedSearchTerm,
        block_hash: '',
        timestamp: undefined,
      } : undefined;

    return [
      ...(pagination.page === 1 && !isLoading ? marketplaceApps.displayedApps.map((item) => ({ type: 'app' as const, app: item })) : []),
      ...(
        config.features.zetachain.isEnabled &&
        pagination.page === 1 &&
        !isLoading &&
        zetaChainCCTXQuery.data ?
          zetaChainCCTXQuery.data.items.map((item) => ({ type: 'zetaChainCCTX' as const, cctx: item })) : []),
      futureBlockItem,
      ...apiData,
    ].filter(Boolean);
  }, [
    data?.items,
    data?.next_page_params,
    isPlaceholderData,
    pagination.page,
    debouncedSearchTerm,
    marketplaceApps.displayedApps,
    isLoading,
    zetaChainCCTXQuery.data,
  ]);

  const sortedDisplayedItems: Array<SearchResultRow> = React.useMemo(() => {
    const firstRank = (pagination.page - 1) * 50 + 1;
    const rankedItems = displayedItems.map((item, index) => ({
      item,
      rank: firstRank + index,
    }));

    return [ ...rankedItems ].sort((a, b) => {
      const result = compareSearchResultRows(a, b, sort.field);
      return sort.direction === 'asc' ? result : -result;
    });
  }, [ displayedItems, pagination.page, sort.direction, sort.field ]);

  const content = (() => {
    if (isError) {
      return <DataFetchAlert/>;
    }

    if (!displayedItems.length) {
      return null;
    }

    return (
      <>
        <Box hideFrom="lg">
          { sortedDisplayedItems.map((row, index) => (
            <SearchResultListItem
              key={ (isLoading ? 'placeholder_' : 'actual_') + row.rank + '_' + index }
              data={ row.item }
              index={ row.rank }
              searchTerm={ debouncedSearchTerm }
              isLoading={ isLoading }
              addressFormat={ settingsContext?.addressFormat }
            />
          )) }
        </Box>
        <Box hideBelow="lg">
          <TableRoot fontWeight={ 500 }>
            <TableHeaderSticky top={ pagination.isVisible ? ACTION_BAR_HEIGHT_DESKTOP : 0 }>
              <TableRow>
                <TableColumnHeaderSortable
                  width="56px"
                  sortField="rank"
                  sortValue={ sortValue }
                  onSortToggle={ handleSortToggle }
                >
                  #
                </TableColumnHeaderSortable>
                <TableColumnHeaderSortable
                  width="28%"
                  sortField="result"
                  sortValue={ sortValue }
                  onSortToggle={ handleSortToggle }
                >
                  Result
                </TableColumnHeaderSortable>
                <TableColumnHeaderSortable
                  width="32%"
                  sortField="details"
                  sortValue={ sortValue }
                  onSortToggle={ handleSortToggle }
                >
                  Details
                </TableColumnHeaderSortable>
                <TableColumnHeaderSortable
                  width="24%"
                  pr={ 10 }
                  sortField="value"
                  sortValue={ sortValue }
                  onSortToggle={ handleSortToggle }
                  isNumeric
                >
                  Value / Date
                </TableColumnHeaderSortable>
                <TableColumnHeaderSortable
                  width="150px"
                  sortField="category"
                  sortValue={ sortValue }
                  onSortToggle={ handleSortToggle }
                >
                  Category
                </TableColumnHeaderSortable>
              </TableRow>
            </TableHeaderSticky>
            <TableBody>
              { sortedDisplayedItems.map((row, index) => (
                <SearchResultTableItem
                  key={ (isLoading ? 'placeholder_' : 'actual_') + row.rank + '_' + index }
                  data={ row.item }
                  index={ row.rank }
                  searchTerm={ debouncedSearchTerm }
                  isLoading={ isLoading }
                  addressFormat={ settingsContext?.addressFormat }
                />
              )) }
            </TableBody>
          </TableRoot>
        </Box>
      </>
    );
  })();

  const bar = (() => {
    if (isError) {
      return null;
    }

    const resultsCount = pagination.page === 1 && !data?.next_page_params ? displayedItems.length : '50+';

    const text = (() => {
      if (isLoading && pagination.page === 1) {
        return <Skeleton loading h={ 6 } w="280px" borderRadius="full" mb={ pagination.isVisible ? 0 : 6 }/>;
      }

      if (resultsCount === 0 && externalSearchItem) {
        return <ExternalSearchItem item={ externalSearchItem }/>;
      }

      return (
        <>
          <Box mb={ pagination.isVisible ? 0 : 6 } lineHeight="32px">
            <span>Found </span>
            <chakra.span fontWeight={ 700 }>
              { resultsCount }
            </chakra.span>
            <span> matching result{ (((displayedItems.length || 0) + marketplaceApps.displayedApps.length) > 1) || pagination.page > 1 ? 's' : '' } for </span>
            “<chakra.span fontWeight={ 700 }>{ debouncedSearchTerm }</chakra.span>”
          </Box>
          { resultsCount === 0 && regexp.BLOCK_HEIGHT.test(debouncedSearchTerm) &&
            <SearchBarSuggestBlockCountdown blockHeight={ debouncedSearchTerm } mt={ -4 }/> }
        </>
      );
    })();

    if (!pagination.isVisible) {
      return text;
    }

    return (
      <>
        <Box hideFrom="lg">{ text }</Box>
        <ActionBar mt={{ base: 0, lg: -6 }} alignItems="center">
          <Box hideBelow="lg">{ text }</Box>
          <Pagination { ...pagination }/>
        </ActionBar>
      </>
    );
  })();

  const renderSearchBar = React.useCallback(() => {
    return (
      <SearchResultsInput
        searchTerm={ searchTerm }
        handleSubmit={ handleSubmit }
        handleSearchTermChange={ handleSearchTermChange }
      />
    );
  }, [ handleSearchTermChange, handleSubmit, searchTerm ]);

  const pageContent = !showContent ? <ContentLoader/> : (
    <>
      <PageTitle title="Search results"/>
      { bar }
      { content }
    </>
  );

  return (
    <>
      <HeaderMobile onGoToSearchResults={ handleNavigateToResults }/>
      <Layout.MainArea>
        <Layout.SideBar/>
        <Layout.MainColumn>
          <HeaderAlert/>
          <HeaderDesktop renderSearchBar={ renderSearchBar }/>
          <AppErrorBoundary>
            <Layout.Content flexGrow={ 0 }>
              { pageContent }
            </Layout.Content>
          </AppErrorBoundary>
        </Layout.MainColumn>
      </Layout.MainArea>
      <Layout.Footer/>
    </>
  );
};

export default React.memo(SearchResultsPageContent);
