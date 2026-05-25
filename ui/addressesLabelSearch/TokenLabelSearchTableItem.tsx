import { Flex } from '@chakra-ui/react';
import BigNumber from 'bignumber.js';
import React from 'react';

import type { TokenLabelSearchItem } from 'types/api/token';

import { Link } from 'toolkit/chakra/link';
import { Skeleton } from 'toolkit/chakra/skeleton';
import { TableCell, TableRow } from 'toolkit/chakra/table';
import AddressEntity from 'ui/shared/entities/address/AddressEntity';
import TokenEntity from 'ui/shared/entities/token/TokenEntity';
import SimpleValue from 'ui/shared/value/SimpleValue';
import { DEFAULT_ACCURACY_USD } from 'ui/shared/value/utils';

import { getTokenLabelWebsite } from './tokenLabelUtils';

interface Props {
  item: TokenLabelSearchItem;
  isLoading?: boolean;
}

const TokenLabelSearchTableItem = ({ item, isLoading }: Props) => {
  const website = getTokenLabelWebsite(item);

  return (
    <TableRow>
      <TableCell>
        <AddressEntity
          address={{ hash: item.address_hash, filecoin: { robust: item.filecoin_robust_address } }}
          isLoading={ isLoading }
          noIcon
          textStyle="sm"
          fontWeight={ 500 }
        />
      </TableCell>
      <TableCell>
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
      <TableCell isNumeric>
        { item.circulating_market_cap ? (
          <SimpleValue
            value={ BigNumber(item.circulating_market_cap) }
            loading={ isLoading }
            prefix="$"
            accuracy={ DEFAULT_ACCURACY_USD }
          />
        ) : null }
      </TableCell>
      <TableCell isNumeric>
        <Skeleton loading={ isLoading } display="inline-block">
          { item.holders_count ? Number(item.holders_count).toLocaleString() : null }
        </Skeleton>
      </TableCell>
      <TableCell>
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
