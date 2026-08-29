import { Flex } from '@chakra-ui/react';
import React from 'react';

import type { Transaction } from 'types/api/transaction';

import { route } from 'nextjs-routes';

import { Link } from 'toolkit/chakra/link';
import TokenTransferSnippet from 'ui/shared/TokenTransferSnippet/TokenTransferSnippet';

type Props = {
  tx: Transaction;
  isLoading?: boolean;
};

const TxTokenTransfersPreview = ({ tx, isLoading }: Props) => {
  // List endpoints serialise token_transfers only for the watchlist
  // (backend transaction_view: single_tx?/watchlist gate); other tx lists
  // send null, so rendering nothing there is by design, not a missing wire.
  const transfers = tx.token_transfers ?? [];

  if (transfers.length === 0) {
    return null;
  }

  const visibleTransfers = transfers.slice(0, 2);
  const hasMore = tx.token_transfers_overflow || transfers.length > visibleTransfers.length;

  return (
    <Flex flexDir="column" rowGap={ 1 } mt={ 2 } alignItems="flex-start" maxW="100%">
      { visibleTransfers.map((transfer, index) => (
        <TokenTransferSnippet
          key={ `${ transfer.transaction_hash }-${ transfer.log_index }-${ index }` }
          data={ transfer }
          isLoading={ isLoading }
        />
      )) }
      { hasMore && (
        <Link textStyle="xs" href={ route({ pathname: '/tx/[hash]', query: { hash: tx.hash, tab: 'token_transfers' } }) }>
          View all token transfers
        </Link>
      ) }
    </Flex>
  );
};

export default React.memo(TxTokenTransfersPreview);
