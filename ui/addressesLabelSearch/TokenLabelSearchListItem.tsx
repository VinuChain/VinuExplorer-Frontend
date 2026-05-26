import { HStack } from '@chakra-ui/react';
import BigNumber from 'bignumber.js';
import React from 'react';

import type { TokenLabelSearchItem } from 'types/api/token';

import { Link } from 'toolkit/chakra/link';
import { Skeleton } from 'toolkit/chakra/skeleton';
import AddressEntity from 'ui/shared/entities/address/AddressEntity';
import TokenEntity from 'ui/shared/entities/token/TokenEntity';
import EntityTag from 'ui/shared/EntityTags/EntityTag';
import ListItemMobile from 'ui/shared/ListItemMobile/ListItemMobile';
import SimpleValue from 'ui/shared/value/SimpleValue';
import { DEFAULT_ACCURACY_USD } from 'ui/shared/value/utils';

import { getTokenLabelTags, getTokenLabelWebsite } from './tokenLabelUtils';

interface Props {
  item: TokenLabelSearchItem;
  index: number;
  isLoading?: boolean;
}

const TokenLabelSearchListItem = ({ item, index, isLoading }: Props) => {
  const website = getTokenLabelWebsite(item);
  const labelTags = getTokenLabelTags(item);

  return (
    <ListItemMobile rowGap={ 2 }>
      <HStack gap={ 2 } maxW="100%" alignItems="center">
        <Skeleton loading={ isLoading } fontSize="sm" fontWeight={ 600 } color="text.secondary" flexShrink={ 0 }>
          #{ index }
        </Skeleton>
        <TokenEntity
          token={ item }
          isLoading={ isLoading }
          jointSymbol
          noCopy
          w="100%"
          textStyle="sm"
          fontWeight={ 700 }
        />
      </HStack>
      <HStack gap={ 3 } maxW="100%" alignItems="flex-start">
        <Skeleton loading={ isLoading } fontSize="sm" fontWeight={ 500 } flexShrink={ 0 }>Contract Address</Skeleton>
        <AddressEntity
          address={{ hash: item.address_hash, filecoin: { robust: item.filecoin_robust_address } }}
          isLoading={ isLoading }
          noIcon
          textStyle="sm"
          color="text.secondary"
        />
      </HStack>
      { labelTags.length > 0 && (
        <HStack gap={ 3 } alignItems="flex-start">
          <Skeleton loading={ isLoading } fontSize="sm" fontWeight={ 500 } flexShrink={ 0 }>Label</Skeleton>
          <HStack gap={ 1 } flexWrap="wrap">
            { labelTags.map((tag) => (
              <EntityTag
                key={ tag.slug }
                data={ tag }
                addressHash={ item.address_hash }
                isLoading={ isLoading }
              />
            )) }
          </HStack>
        </HStack>
      ) }
      { item.exchange_rate && (
        <HStack gap={ 3 }>
          <Skeleton loading={ isLoading } fontSize="sm" fontWeight={ 500 }>Price</Skeleton>
          <SimpleValue
            value={ BigNumber(item.exchange_rate) }
            loading={ isLoading }
            prefix="$"
            accuracy={ DEFAULT_ACCURACY_USD }
            textStyle="sm"
            color="text.secondary"
          />
        </HStack>
      ) }
      { item.circulating_market_cap && (
        <HStack gap={ 3 }>
          <Skeleton loading={ isLoading } fontSize="sm" fontWeight={ 500 }>Market Cap</Skeleton>
          <SimpleValue
            value={ BigNumber(item.circulating_market_cap) }
            loading={ isLoading }
            prefix="$"
            accuracy={ DEFAULT_ACCURACY_USD }
            textStyle="sm"
            color="text.secondary"
          />
        </HStack>
      ) }
      <HStack gap={ 3 }>
        <Skeleton loading={ isLoading } fontSize="sm" fontWeight={ 500 }>Holders</Skeleton>
        <Skeleton loading={ isLoading } fontSize="sm" color="text.secondary">
          <span>{ item.holders_count ? Number(item.holders_count).toLocaleString() : null }</span>
        </Skeleton>
      </HStack>
      { website && (
        <HStack gap={ 3 }>
          <Skeleton loading={ isLoading } fontSize="sm" fontWeight={ 500 }>Website</Skeleton>
          <Link external href={ website.href } variant="underlaid" textStyle="sm">
            { website.domain }
          </Link>
        </HStack>
      ) }
    </ListItemMobile>
  );
};

export default React.memo(TokenLabelSearchListItem);
