import { Box } from '@chakra-ui/react';
import React from 'react';

import useInternalTransactionsMetadata from 'lib/address/useInternalTransactionsMetadata';
import InternalTxsList from 'ui/internalTxs/InternalTxsList';
import InternalTxsTable from 'ui/internalTxs/InternalTxsTable';
import DataListDisplay from 'ui/shared/DataListDisplay';
import type { QueryWithPagesResult } from 'ui/shared/pagination/useQueryWithPages';

interface Props {
  query: QueryWithPagesResult<'general:block_internal_txs'>;
  top?: number;
}

const BlockInternalTxs = ({ query, top }: Props) => {
  const { data, isPlaceholderData, isError } = query;
  const enrichedItems = useInternalTransactionsMetadata(data?.items);

  const content = enrichedItems ? (
    <>
      <Box hideFrom="lg">
        <InternalTxsList data={ enrichedItems } isLoading={ isPlaceholderData } showBlockInfo={ false }/>
      </Box>
      <Box hideBelow="lg">
        <InternalTxsTable data={ enrichedItems } isLoading={ isPlaceholderData } top={ top } showBlockInfo={ false }/>
      </Box>
    </>
  ) : null;

  return (
    <DataListDisplay
      isError={ isError }
      itemsNum={ enrichedItems?.length }
      emptyText="There are no internal transactions."
    >
      { content }
    </DataListDisplay>
  );
};

export default React.memo(BlockInternalTxs);
