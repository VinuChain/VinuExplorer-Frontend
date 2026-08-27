import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import React from 'react';

import type { TxsSocketType } from './types';

import useGradualIncrement from 'lib/hooks/useGradualIncrement';
import getQueryParamString from 'lib/router/getQueryParamString';
import useSocketChannel from 'lib/socket/useSocketChannel';
import useSocketMessage from 'lib/socket/useSocketMessage';

// The global `transactions:new_transaction` channel only broadcasts a COUNT of
// new transactions, not their data (unlike the per-address channel), so the
// list can only announce them; they are applied by refetching the first page
// when the user asks. Keyed by the React Query resource backing each list
// (queryKey[0]).
const RESOURCE_BY_TYPE: Partial<Record<TxsSocketType, string>> = {
  txs_home: 'general:homepage_txs',
  txs_validated: 'general:txs_validated',
  txs_pending: 'general:txs_pending',
};

function getSocketParams(type: TxsSocketType, page: string) {

  switch (type) {
    case 'txs_home': {
      return { topic: 'transactions:new_transaction' as const, event: 'transaction' as const };
    }
    case 'txs_validated': {
      return !page || page === '1' ? { topic: 'transactions:new_transaction' as const, event: 'transaction' as const } : {};
    }
    case 'txs_pending': {
      return !page || page === '1' ? { topic: 'transactions:new_pending_transaction' as const, event: 'pending_transaction' as const } : {};
    }
    default:
      return {};
  }
}

function assertIsNewTxResponse(response: unknown): response is { transaction: number } {
  return typeof response === 'object' && response !== null && 'transaction' in response;
}
function assertIsNewPendingTxResponse(response: unknown): response is { pending_transaction: number } {
  return typeof response === 'object' && response !== null && 'pending_transaction' in response;
}

interface Params {
  type: TxsSocketType;
  isLoading?: boolean;
}

export default function useNewTxsSocketTypeAll({ type, isLoading }: Params) {
  const router = useRouter();
  const page = getQueryParamString(router.query.page);

  const [ num, setNum, resetNum ] = useGradualIncrement(0);
  const [ showErrorAlert, setShowErrorAlert ] = React.useState(false);

  const queryClient = useQueryClient();
  const resourceName = RESOURCE_BY_TYPE[type];
  const isFetching = useIsFetching({ queryKey: [ resourceName ] }) > 0;

  // Whatever refreshed the list (notice click, Refresh button, page change)
  // has now shown the announced transactions, so the counter starts over.
  React.useEffect(() => {
    if (!isFetching) {
      resetNum();
    }
  }, [ isFetching, resetNum ]);

  // Prefix match on the resource name (queryKey[0]) so the currently
  // displayed list — regardless of its pagination params — is refetched.
  const refetch = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [ resourceName ] });
  }, [ queryClient, resourceName ]);

  const { topic, event } = getSocketParams(type, page);

  const handleNewTxMessage = React.useCallback((response: { transaction: number } | { pending_transaction: number } | unknown) => {
    if (assertIsNewTxResponse(response)) {
      setNum(response.transaction);
    }
    if (assertIsNewPendingTxResponse(response)) {
      setNum(response.pending_transaction);
    }
  }, [ setNum ]);

  const handleSocketClose = React.useCallback(() => {
    setShowErrorAlert(true);
  }, []);

  const handleSocketError = React.useCallback(() => {
    setShowErrorAlert(true);
  }, []);

  const channel = useSocketChannel({
    topic,
    onSocketClose: handleSocketClose,
    onSocketError: handleSocketError,
    isDisabled: !topic || Boolean(isLoading),
  });

  useSocketMessage({
    channel,
    event,
    handler: handleNewTxMessage,
  });

  if (!topic && !event) {
    return { };
  }

  return { num, showErrorAlert, refetch };
}
