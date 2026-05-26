import type { FlexProps } from '@chakra-ui/react';
import { Flex } from '@chakra-ui/react';
import React from 'react';

import type { AddressParamBasic } from 'types/api/addressParams';

import EntityTag from 'ui/shared/EntityTags/EntityTag';
import { getAddressLabelTags } from 'ui/shared/EntityTags/utils';

type AddressLike = Pick<AddressParamBasic, 'hash' | 'metadata'>;

interface Props extends FlexProps {
  addresses: Array<AddressLike | null | undefined>;
  isLoading?: boolean;
}

export function hasAddressLabelTags(addresses: Array<AddressLike | null | undefined>) {
  return addresses.some((address) => getAddressLabelTags(address?.metadata?.tags).length > 0);
}

const AddressLabelTags = ({ addresses, isLoading, ...rest }: Props) => {
  const seen = new Set<string>();
  const tags = addresses.flatMap((address) => {
    if (!address) {
      return [];
    }

    return getAddressLabelTags(address.metadata?.tags)
      .map((tag) => ({ tag, addressHash: address.hash }))
      .filter(({ tag, addressHash }) => {
        const key = `${ addressHash.toLowerCase() }-${ tag.slug }`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  });

  if (tags.length === 0) {
    return null;
  }

  return (
    <Flex columnGap={ 1 } rowGap={ 1 } flexWrap="wrap" alignItems="center" { ...rest }>
      { tags.map(({ tag, addressHash }, index) => (
        <EntityTag
          key={ `${ addressHash }-${ tag.slug }-${ index }` }
          data={ tag }
          addressHash={ addressHash }
          isLoading={ isLoading }
        />
      )) }
    </Flex>
  );
};

export default React.memo(AddressLabelTags);
