import { Flex } from '@chakra-ui/react';
import BigNumber from 'bignumber.js';
import React from 'react';

import type { TokenLabelSearchItem } from 'types/api/token';

import { Link } from 'toolkit/chakra/link';
import { Skeleton } from 'toolkit/chakra/skeleton';
import { TableCell, TableRow } from 'toolkit/chakra/table';
import AddressEntity from 'ui/shared/entities/address/AddressEntity';
import TokenEntity from 'ui/shared/entities/token/TokenEntity';
import EntityTag from 'ui/shared/EntityTags/EntityTag';
import SimpleValue from 'ui/shared/value/SimpleValue';
import { DEFAULT_ACCURACY_USD } from 'ui/shared/value/utils';

import { getTokenLabelTags, getTokenLabelWebsite } from './tokenLabelUtils';

interface Props {
  item: TokenLabelSearchItem;
  index: number;
  isLoading?: boolean;
}

const TokenLabelSearchTableItem = ({ item, index, isLoading }: Props) => {
  const website = getTokenLabelWebsite(item);
  const labelTags = getTokenLabelTags(item);

  return (
    <TableRow>
      <TableCell py={ 3 } color="text.secondary" fontWeight={ 600 } whiteSpace="nowrap">
        <Skeleton loading={ isLoading } display="inline-block">
          { index }
        </Skeleton>
      </TableCell>
      <TableCell py={ 3 }>
        <AddressEntity
          address={{ hash: item.address_hash, filecoin: { robust: item.filecoin_robust_address } }}
          isLoading={ isLoading }
          noIcon
          textStyle="sm"
          fontWeight={ 500 }
        />
      </TableCell>
      <TableCell py={ 3 }>
        <Flex alignItems="center" columnGap={ 2 } minW={ 0 }>
          <TokenEntity
            token={ item }
            isLoading={ isLoading }
            jointSymbol
            noCopy
            w="auto"
            textStyle="sm"
            fontWeight={ 700 }
          />
        </Flex>
      </TableCell>
      <TableCell py={ 3 }>
        <Flex gap={ 1 } flexWrap="wrap">
          { labelTags.map((tag) => (
            <EntityTag
              key={ tag.slug }
              data={ tag }
              addressHash={ item.address_hash }
              isLoading={ isLoading }
              maxW="100%"
            />
          )) }
        </Flex>
      </TableCell>
      <TableCell py={ 3 } isNumeric whiteSpace="nowrap">
        { item.exchange_rate ? (
          <SimpleValue
            value={ BigNumber(item.exchange_rate) }
            loading={ isLoading }
            prefix="$"
            accuracy={ DEFAULT_ACCURACY_USD }
            w="100%"
            justifyContent="flex-end"
          />
        ) : null }
      </TableCell>
      <TableCell py={ 3 } isNumeric whiteSpace="nowrap">
        { item.circulating_market_cap ? (
          <SimpleValue
            value={ BigNumber(item.circulating_market_cap) }
            loading={ isLoading }
            prefix="$"
            accuracy={ DEFAULT_ACCURACY_USD }
            w="100%"
            justifyContent="flex-end"
          />
        ) : null }
      </TableCell>
      <TableCell py={ 3 } isNumeric whiteSpace="nowrap">
        <Skeleton loading={ isLoading } display="inline-block">
          { item.holders_count ? Number(item.holders_count).toLocaleString() : null }
        </Skeleton>
      </TableCell>
      <TableCell py={ 3 }>
        { website && (
          <Link external href={ website.href } variant="underlaid" textStyle="sm">
            { website.domain }
          </Link>
        ) }
      </TableCell>
    </TableRow>
  );
};

export default React.memo(TokenLabelSearchTableItem);
