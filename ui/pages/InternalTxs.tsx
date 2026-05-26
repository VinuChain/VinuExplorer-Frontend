import { Box } from '@chakra-ui/react';
import React from 'react';

import useInternalTransactionsMetadata from 'lib/address/useInternalTransactionsMetadata';
import useIsMobile from 'lib/hooks/useIsMobile';
import { FilterInput } from 'toolkit/components/filters/FilterInput';
import { apos } from 'toolkit/utils/htmlEntities';
import InternalTxsList from 'ui/internalTxs/InternalTxsList';
import InternalTxsTable from 'ui/internalTxs/InternalTxsTable';
import useInternalTxsQuery from 'ui/internalTxs/useInternalTxsQuery';
import ActionBar from 'ui/shared/ActionBar';
import DataListDisplay from 'ui/shared/DataListDisplay';
import PageTitle from 'ui/shared/Page/PageTitle';
import Pagination from 'ui/shared/pagination/Pagination';

const InternalTxs = () => {

  const isMobile = useIsMobile();

  const { query, searchTerm, debouncedSearchTerm, onSearchTermChange } = useInternalTxsQuery();
  const { isError, isPlaceholderData, data, pagination } = query;
  const enrichedItems = useInternalTransactionsMetadata(data?.items);

  const filterInput = (
    <FilterInput
      w={{ base: '100%', lg: '350px' }}
      size="sm"
      onChange={ onSearchTermChange }
      placeholder="Search by transaction hash"
      initialValue={ searchTerm }
    />
  );

  const actionBar = (
    <>
      <Box mb={ 6 } display={{ base: 'flex', lg: 'none' }}>
        { filterInput }
      </Box>
      { (!isMobile || pagination.isVisible) && (
        <ActionBar mt={ -6 }>
          <Box display={{ base: 'none', lg: 'flex' }}>
            { filterInput }
          </Box>
          <Pagination ml="auto" { ...pagination }/>
        </ActionBar>
      ) }
    </>
  );

  const content = enrichedItems ? (
    <>
      <Box hideFrom="lg">
        <InternalTxsList data={ enrichedItems } isLoading={ isPlaceholderData }/>
      </Box>
      <Box hideBelow="lg">
        <InternalTxsTable data={ enrichedItems } isLoading={ isPlaceholderData }/>
      </Box>
    </>
  ) : null;

  return (
    <>
      <PageTitle
        title="Internal transactions"
        withTextAd
      />
      <DataListDisplay
        isError={ isError }
        itemsNum={ enrichedItems?.length }
        emptyText="There are no internal transactions."
        filterProps={{
          emptyFilteredText: `Couldn${ apos }t find any internal transaction that matches your query.`,
          hasActiveFilters: Boolean(debouncedSearchTerm),
        }}
        actionBar={ actionBar }
      >
        { content }
      </DataListDisplay>
    </>
  );
};

export default InternalTxs;
