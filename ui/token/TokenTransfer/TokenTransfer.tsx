import { Box } from '@chakra-ui/react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import React, { useMemo } from 'react';

import type { SocketMessage } from 'lib/socket/types';
import type { TokenInfo, TokenInstance } from 'types/api/token';

import useAddressesMetadata from 'lib/address/useAddressesMetadata';
import type { ResourceError } from 'lib/api/resources';
import useGradualIncrement from 'lib/hooks/useGradualIncrement';
import useIsMobile from 'lib/hooks/useIsMobile';
import useIsMounted from 'lib/hooks/useIsMounted';
import useSocketChannel from 'lib/socket/useSocketChannel';
import useSocketMessage from 'lib/socket/useSocketMessage';
import ActionBar from 'ui/shared/ActionBar';
import DataListDisplay from 'ui/shared/DataListDisplay';
import Pagination from 'ui/shared/pagination/Pagination';
import type { QueryWithPagesResult } from 'ui/shared/pagination/useQueryWithPages';
import * as SocketNewItemsNotice from 'ui/shared/SocketNewItemsNotice';
import TokenAdvancedFilterLink from 'ui/token/TokenAdvancedFilterLink';
import TokenTransferList from 'ui/token/TokenTransfer/TokenTransferList';
import TokenTransferTable from 'ui/token/TokenTransfer/TokenTransferTable';

const TABS_HEIGHT = 88;

type Props = {
  transfersQuery: QueryWithPagesResult<'general:token_transfers'> | QueryWithPagesResult<'general:token_instance_transfers'>;
  tokenId?: string;
  tokenInstance?: TokenInstance;
  tokenQuery: UseQueryResult<TokenInfo, ResourceError<unknown>>;
  shouldRender?: boolean;
  tabsHeight?: number;
};

const TokenTransfer = ({ transfersQuery, tokenId, tokenQuery, tabsHeight = TABS_HEIGHT, tokenInstance, shouldRender = true }: Props) => {
  const isMobile = useIsMobile();
  const isMounted = useIsMounted();
  const router = useRouter();
  const { isError, isPlaceholderData, data, pagination } = transfersQuery;
  const { data: token, isPlaceholderData: isTokenPlaceholderData, isError: isTokenError } = tokenQuery;

  const [ newItemsCount, setNewItemsCount ] = useGradualIncrement(0);
  const [ showSocketErrorAlert, setShowSocketErrorAlert ] = React.useState(false);

  const handleNewTransfersMessage: SocketMessage.TokenTransfers['handler'] = (payload) => {
    setNewItemsCount(payload.token_transfer);
  };

  const handleSocketClose = React.useCallback(() => {
    setShowSocketErrorAlert(true);
  }, []);

  const handleSocketError = React.useCallback(() => {
    setShowSocketErrorAlert(true);
  }, []);

  const channel = useSocketChannel({
    topic: `tokens:${ router.query.hash?.toString().toLowerCase() }`,
    onSocketClose: handleSocketClose,
    onSocketError: handleSocketError,
    isDisabled: isPlaceholderData || isError || pagination.page !== 1,
  });
  useSocketMessage({
    channel,
    event: 'token_transfer',
    handler: handleNewTransfersMessage,
  });

  const items = data?.items;

  const hashesForMetadata = useMemo(
    () => (items ?? [])
      .flatMap((i) => [ i.from?.hash, i.to?.hash ])
      .filter((h): h is string => Boolean(h)),
    [ items ],
  );
  const { getMetadata } = useAddressesMetadata(hashesForMetadata);

  const enrichedItems = useMemo(() => {
    if (!items) return items;
    return items.map((i) => ({
      ...i,
      from: i.from && { ...i.from, metadata: getMetadata(i.from.hash) ?? i.from.metadata },
      to: i.to && { ...i.to, metadata: getMetadata(i.to.hash) ?? i.to.metadata },
    }));
  }, [ items, getMetadata ]);

  if (!isMounted || !shouldRender) {
    return null;
  }

  const isLoading = isPlaceholderData || isTokenPlaceholderData;

  const content = enrichedItems && token ? (
    <>
      <Box display={{ base: 'none', lg: 'block' }}>
        <TokenTransferTable
          data={ enrichedItems }
          top={ tabsHeight }
          showSocketInfo={ pagination.page === 1 }
          showSocketErrorAlert={ showSocketErrorAlert }
          socketInfoNum={ newItemsCount }
          tokenId={ tokenId }
          token={ token }
          instance={ tokenInstance }
          isLoading={ isLoading }
        />
      </Box>
      <Box display={{ base: 'block', lg: 'none' }}>
        { pagination.page === 1 && (
          <SocketNewItemsNotice.Mobile
            num={ newItemsCount }
            showErrorAlert={ showSocketErrorAlert }
            type="token_transfer"
            isLoading={ isLoading }
          />
        ) }
        <TokenTransferList data={ enrichedItems } tokenId={ tokenId } instance={ tokenInstance } isLoading={ isLoading }/>
      </Box>
    </>
  ) : null;

  const actionBar = isMobile && pagination.isVisible ? (
    <ActionBar mt={ -6 }>
      <TokenAdvancedFilterLink token={ token }/>
      <Pagination ml="auto" { ...pagination }/>
    </ActionBar>
  ) : null;

  return (
    <DataListDisplay
      isError={ isError || isTokenError }
      itemsNum={ enrichedItems?.length }
      emptyText="There are no token transfers."
      actionBar={ actionBar }
    >
      { content }
    </DataListDisplay>
  );
};

export default React.memo(TokenTransfer);
