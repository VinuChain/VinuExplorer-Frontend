import { Box } from '@chakra-ui/react';
import React, { useMemo } from 'react';

import type { InternalTransaction } from 'types/api/internalTransaction';

import useAddressesMetadata from 'lib/address/useAddressesMetadata';
import useIsMounted from 'lib/hooks/useIsMounted';
import { apos } from 'toolkit/utils/htmlEntities';
import InternalTxsList from 'ui/internalTxs/InternalTxsList';
import InternalTxsTable from 'ui/internalTxs/InternalTxsTable';
import ActionBar from 'ui/shared/ActionBar';
import DataListDisplay from 'ui/shared/DataListDisplay';
import Pagination from 'ui/shared/pagination/Pagination';

import AddressCsvExportLink from './AddressCsvExportLink';
import AddressTxsFilter from './AddressTxsFilter';
import useAddressInternalTxsQuery from './useAddressInternalTxsQuery';

type Props = {
  shouldRender?: boolean;
  isQueryEnabled?: boolean;
};
const AddressInternalTxs = ({ shouldRender = true, isQueryEnabled = true }: Props) => {
  const isMounted = useIsMounted();

  const { hash, query, filterValue, onFilterChange } = useAddressInternalTxsQuery({ enabled: isQueryEnabled });
  const { data, isPlaceholderData, isError, pagination } = query;

  const items = data?.items;

  const hashesForMetadata = useMemo(
    () => (items ?? [])
      .flatMap((i) => [ i.from?.hash, i.to?.hash, i.created_contract?.hash ])
      .filter((h): h is string => Boolean(h)),
    [ items ],
  );
  const { getMetadata } = useAddressesMetadata(hashesForMetadata);

  const enrichedItems: Array<InternalTransaction> | undefined = useMemo(() => {
    if (!items) return items;
    return items.map((i): InternalTransaction => {
      const base = {
        ...i,
        from: { ...i.from, metadata: getMetadata(i.from.hash) ?? i.from.metadata },
      };
      if (i.to) {
        return {
          ...base,
          to: { ...i.to, metadata: getMetadata(i.to.hash) ?? i.to.metadata },
          created_contract: null,
        };
      }
      return {
        ...base,
        to: null,
        created_contract: {
          ...i.created_contract,
          metadata: getMetadata(i.created_contract.hash) ?? i.created_contract.metadata,
        },
      };
    });
  }, [ items, getMetadata ]);

  if (!isMounted || !shouldRender) {
    return null;
  }

  const content = enrichedItems ? (
    <>
      <Box hideFrom="lg">
        <InternalTxsList data={ enrichedItems } currentAddress={ hash } isLoading={ isPlaceholderData }/>
      </Box>
      <Box hideBelow="lg">
        <InternalTxsTable data={ enrichedItems } currentAddress={ hash } isLoading={ isPlaceholderData }/>
      </Box>
    </>
  ) : null ;

  const actionBar = (
    <ActionBar mt={ -6 } justifyContent="left">
      <AddressTxsFilter
        initialValue={ filterValue }
        onFilterChange={ onFilterChange }
        hasActiveFilter={ Boolean(filterValue) }
        isLoading={ pagination.isLoading }
      />
      <AddressCsvExportLink
        address={ hash }
        isLoading={ pagination.isLoading }
        params={{ type: 'internal-transactions', filterType: 'address', filterValue }}
        ml={{ base: 2, lg: 'auto' }}
      />
      <Pagination ml={{ base: 'auto', lg: 8 }} { ...pagination }/>
    </ActionBar>
  );

  return (
    <DataListDisplay
      isError={ isError }
      itemsNum={ enrichedItems?.length }
      filterProps={{ emptyFilteredText: `Couldn${ apos }t find any transaction that matches your query.`, hasActiveFilters: Boolean(filterValue) }}
      emptyText="There are no internal transactions for this address."
      actionBar={ actionBar }
    >
      { content }
    </DataListDisplay>
  );
};

export default AddressInternalTxs;
