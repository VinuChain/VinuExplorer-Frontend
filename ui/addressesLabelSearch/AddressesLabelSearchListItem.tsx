import { Flex, HStack } from '@chakra-ui/react';
import React from 'react';

import type { AddressesItem } from 'types/api/addresses';

import { currencyUnits } from 'lib/units';
import { Skeleton } from 'toolkit/chakra/skeleton';
import AddressEntity from 'ui/shared/entities/address/AddressEntity';
import EntityTag from 'ui/shared/EntityTags/EntityTag';
import { withFallbackLabelIcons } from 'ui/shared/EntityTags/utils';
import ListItemMobile from 'ui/shared/ListItemMobile/ListItemMobile';
import NativeCoinValue from 'ui/shared/value/NativeCoinValue';

type Props = {
  item: AddressesItem;
  isLoading?: boolean;
};

const AddressesLabelSearchListItem = ({
  item,
  isLoading,
}: Props) => {

  // See AddressesLabelSearchTableItem — surface category-typed tag
  // chips so rows whose only public tag is the category label still
  // render the matching chip alongside the bare address.
  const labelTags = withFallbackLabelIcons(item.metadata?.tags ?? []).filter((tag) => tag.tagType !== 'name');

  return (
    <ListItemMobile rowGap={ 3 }>
      <AddressEntity
        address={ item }
        isLoading={ isLoading }
        fontWeight={ 700 }
        w="100%"
      />
      { labelTags.length > 0 && (
        <Flex columnGap={ 1 } rowGap={ 1 } flexWrap="wrap">
          { labelTags.map((tag) => (
            <EntityTag
              key={ tag.slug }
              data={ tag }
              addressHash={ item.hash }
              isLoading={ isLoading }
            />
          )) }
        </Flex>
      ) }
      <HStack gap={ 3 } maxW="100%" alignItems="flex-start">
        <Skeleton loading={ isLoading } fontSize="sm" fontWeight={ 500 } flexShrink={ 0 }>{ `Balance ${ currencyUnits.ether }` }</Skeleton>
        <NativeCoinValue
          amount={ item.coin_balance }
          noSymbol
          loading={ isLoading }
          fontSize="sm"
          color="text.secondary"
        />
      </HStack>
      <HStack gap={ 3 }>
        <Skeleton loading={ isLoading } fontSize="sm" fontWeight={ 500 }>Txn count</Skeleton>
        <Skeleton loading={ isLoading } fontSize="sm" color="text.secondary">
          <span>{ Number(item.transactions_count).toLocaleString() }</span>
        </Skeleton>
      </HStack>
    </ListItemMobile>
  );
};

export default React.memo(AddressesLabelSearchListItem);
