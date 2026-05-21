import { Box } from '@chakra-ui/react';
import React, { useMemo } from 'react';

import type { TxsSocketType } from './socket/types';
import type { AddressFromToFilter } from 'types/api/address';
import type { Transaction, TransactionsSortingField, TransactionsSortingValue } from 'types/api/transaction';
import type { PaginationParams } from 'ui/shared/pagination/types';

import useAddressesMetadata from 'lib/address/useAddressesMetadata';
import useIsMobile from 'lib/hooks/useIsMobile';
import { apos } from 'toolkit/utils/htmlEntities';
import AddressCsvExportLink from 'ui/address/AddressCsvExportLink';
import { ACTION_BAR_HEIGHT_DESKTOP } from 'ui/shared/ActionBar';
import DataListDisplay from 'ui/shared/DataListDisplay';
import getNextSortValue from 'ui/shared/sort/getNextSortValue';

import useDescribeTxs from './noves/useDescribeTxs';
import TxsHeaderMobile from './TxsHeaderMobile';
import TxsList from './TxsList';
import TxsTable from './TxsTable';

const SORT_SEQUENCE: Record<TransactionsSortingField, Array<TransactionsSortingValue>> = {
  value: [ 'value-desc', 'value-asc', 'default' ],
  fee: [ 'fee-desc', 'fee-asc', 'default' ],
  block_number: [ 'block_number-asc', 'default' ],
};

type Props = {
  pagination: PaginationParams;
  showBlockInfo?: boolean;
  socketType?: TxsSocketType;
  currentAddress?: string;
  filter?: React.ReactNode;
  filterValue?: AddressFromToFilter;
  enableTimeIncrement?: boolean;
  top?: number;
  items?: Array<Transaction>;
  isPlaceholderData: boolean;
  isError: boolean;
  setSorting?: (value: TransactionsSortingValue) => void;
  sort: TransactionsSortingValue;
  stickyHeader?: boolean;
};

const TxsContent = ({
  pagination,
  filter,
  filterValue,
  showBlockInfo = true,
  socketType,
  currentAddress,
  enableTimeIncrement,
  top,
  items,
  isPlaceholderData,
  isError,
  setSorting,
  sort,
  stickyHeader = true,
}: Props) => {
  const isMobile = useIsMobile();

  const onSortToggle = React.useCallback((field: TransactionsSortingField) => {
    const value = getNextSortValue<TransactionsSortingField, TransactionsSortingValue>(SORT_SEQUENCE, field)(sort);
    setSorting?.(value);
  }, [ sort, setSorting ]);

  const hashesForMetadata = useMemo(
    () => (items ?? [])
      .flatMap((i) => [ i.from?.hash, i.to?.hash, i.created_contract?.hash ])
      .filter((h): h is string => Boolean(h)),
    [ items ],
  );
  const { getMetadata } = useAddressesMetadata(hashesForMetadata);

  const enrichedItems: Array<Transaction> | undefined = useMemo(() => {
    if (!items) return items;
    return items.map((i) => ({
      ...i,
      from: i.from && { ...i.from, metadata: getMetadata(i.from.hash) ?? i.from.metadata },
      to: i.to && { ...i.to, metadata: getMetadata(i.to.hash) ?? i.to.metadata },
      created_contract: i.created_contract && {
        ...i.created_contract,
        metadata: getMetadata(i.created_contract.hash) ?? i.created_contract.metadata,
      },
    }));
  }, [ items, getMetadata ]);

  const translationQuery = useDescribeTxs(enrichedItems, currentAddress, isPlaceholderData);

  const content = enrichedItems && enrichedItems.length > 0 ? (
    <>
      <Box hideFrom="lg">
        <TxsList
          showBlockInfo={ showBlockInfo }
          socketType={ socketType }
          isLoading={ isPlaceholderData }
          enableTimeIncrement={ enableTimeIncrement }
          currentAddress={ currentAddress }
          items={ enrichedItems }
          translationQuery={ translationQuery }
        />
      </Box>
      <Box hideBelow="lg">
        <TxsTable
          txs={ enrichedItems }
          sort={ sort }
          onSortToggle={ setSorting ? onSortToggle : undefined }
          showBlockInfo={ showBlockInfo }
          socketType={ socketType }
          top={ top || (pagination.isVisible ? ACTION_BAR_HEIGHT_DESKTOP : 0) }
          currentAddress={ currentAddress }
          enableTimeIncrement={ enableTimeIncrement }
          isLoading={ isPlaceholderData }
          stickyHeader={ stickyHeader }
          translationQuery={ translationQuery }
        />
      </Box>
    </>
  ) : null;

  const actionBar = isMobile ? (
    <TxsHeaderMobile
      mt={ -6 }
      sorting={ sort }
      setSorting={ setSorting }
      paginationProps={ pagination }
      showPagination={ pagination.isVisible }
      filterComponent={ filter }
      linkSlot={ currentAddress ? (
        <AddressCsvExportLink
          address={ currentAddress }
          params={{ type: 'transactions', filterType: 'address', filterValue }}
          isLoading={ pagination.isLoading }
        />
      ) : null
      }
    />
  ) : null;

  return (
    <DataListDisplay
      isError={ isError }
      itemsNum={ enrichedItems?.length }
      emptyText="There are no transactions."
      actionBar={ actionBar }
      filterProps={{
        hasActiveFilters: Boolean(filterValue),
        emptyFilteredText: `Couldn${ apos }t find any transaction that matches your query.`,
      }}
    >
      { content }
    </DataListDisplay>
  );
};

export default TxsContent;
