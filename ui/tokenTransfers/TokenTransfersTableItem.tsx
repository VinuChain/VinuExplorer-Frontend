import { Flex } from '@chakra-ui/react';
import React from 'react';

import type { TokenTransfer } from 'types/api/tokenTransfer';
import type { ClusterChainConfig } from 'types/multichain';

import { NFT_TOKEN_TYPE_IDS } from 'lib/token/tokenTypes';
import { Badge } from 'toolkit/chakra/badge';
import { Skeleton } from 'toolkit/chakra/skeleton';
import { TableCell, TableRow } from 'toolkit/chakra/table';
import AddressFromTo from 'ui/shared/address/AddressFromTo';
import BlockEntity from 'ui/shared/entities/block/BlockEntity';
import NftEntity from 'ui/shared/entities/nft/NftEntity';
import TxEntity from 'ui/shared/entities/tx/TxEntity';
import EntityTag from 'ui/shared/EntityTags/EntityTag';
import ChainIcon from 'ui/shared/externalChains/ChainIcon';
import TimeWithTooltip from 'ui/shared/time/TimeWithTooltip';
import TokenValue from 'ui/shared/value/TokenValue';

const categoryTagsFor = (address: TokenTransfer['from'] | TokenTransfer['to']) =>
  (address?.metadata?.tags ?? []).filter((tag) => tag.tagType !== 'name');

type Props = {
  item: TokenTransfer;
  isLoading?: boolean;
  chainData?: ClusterChainConfig;
};

const TokenTransferTableItem = ({ item, isLoading, chainData }: Props) => {
  const fromTags = categoryTagsFor(item.from);
  const toTags = categoryTagsFor(item.to);

  return (
    <TableRow>
      { chainData && (
        <TableCell>
          <ChainIcon data={ chainData } isLoading={ isLoading }/>
        </TableCell>
      ) }
      <TableCell>
        { item.transaction_hash ? (
          <TxEntity
            hash={ item.transaction_hash }
            isLoading={ isLoading }
            fontWeight={ 600 }
            noIcon
            truncation="constant_long"
          />
        ) : (
          <Skeleton loading={ isLoading }>-</Skeleton>
        ) }
        <TimeWithTooltip
          timestamp={ item.timestamp }
          enableIncrement
          isLoading={ isLoading }
          color="text.secondary"
          fontWeight="400"
          display="inline-block"
        />
      </TableCell>
      <TableCell maxW="120px">
        { item.method && <Badge loading={ isLoading }>{ item.method }</Badge> }
      </TableCell>
      <TableCell>
        <BlockEntity number={ item.block_number } isLoading={ isLoading } noIcon/>
      </TableCell>
      <TableCell>
        <Flex flexDir="column" rowGap={ 2 }>
          <AddressFromTo
            maxW={{ lg: '220px', xl: '320px' }}
            from={ item.from }
            to={ item.to }
            isLoading={ isLoading }
            mode={{ lg: 'compact', xl: 'long' }}
          />
          { (fromTags.length > 0 || toTags.length > 0) && (
            <Flex flexDir="column" rowGap={ 1 }>
              { fromTags.length > 0 && (
                <Flex columnGap={ 1 } rowGap={ 1 } flexWrap="wrap">
                  { fromTags.map((tag) => (
                    <EntityTag key={ `from-${ tag.slug }` } data={ tag } addressHash={ item.from.hash } isLoading={ isLoading }/>
                  )) }
                </Flex>
              ) }
              { toTags.length > 0 && item.to && (
                <Flex columnGap={ 1 } rowGap={ 1 } flexWrap="wrap">
                  { toTags.map((tag) => (
                    <EntityTag key={ `to-${ tag.slug }` } data={ tag } addressHash={ item.to!.hash } isLoading={ isLoading }/>
                  )) }
                </Flex>
              ) }
            </Flex>
          ) }
        </Flex>
      </TableCell>
      <TableCell>
        { item.total && 'token_id' in item.total && item.token && (NFT_TOKEN_TYPE_IDS.includes(item.token.type)) && item.total.token_id !== null ? (
          <NftEntity
            hash={ item.token.address_hash }
            id={ item.total.token_id }
            instance={ item.total.token_instance }
            isLoading={ isLoading }
            maxW="140px"
          />
        ) : <Skeleton loading={ isLoading }>-</Skeleton> }
      </TableCell>
      <TableCell isNumeric verticalAlign="top">
        { item.token && item.total && 'value' in item.total && item.total.value !== null ?
          (
            <TokenValue
              amount={ item.total.value }
              token={ item.token }
              decimals={ item.total.decimals || '0' }
              layout="vertical"
              loading={ isLoading }
            />
          ) :
          <Skeleton loading={ isLoading }>-</Skeleton>
        }
      </TableCell>
    </TableRow>
  );
};

export default React.memo(TokenTransferTableItem);
