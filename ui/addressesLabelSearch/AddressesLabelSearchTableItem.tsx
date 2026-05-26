import { Flex } from '@chakra-ui/react';
import React from 'react';

import type { AddressesItem } from 'types/api/addresses';

import { Skeleton } from 'toolkit/chakra/skeleton';
import { TableCell, TableRow } from 'toolkit/chakra/table';
import AddressEntity from 'ui/shared/entities/address/AddressEntity';
import EntityTag from 'ui/shared/EntityTags/EntityTag';
import { withFallbackLabelIcons } from 'ui/shared/EntityTags/utils';
import NativeCoinValue from 'ui/shared/value/NativeCoinValue';

type Props = {
  item: AddressesItem;
  index: number;
  isLoading?: boolean;
};

const AddressesLabelSearchTableItem = ({
  item,
  index,
  isLoading,
}: Props) => {

  // Surface the tag chips matched by this search so a row whose only
  // tag is a category label (e.g. a project-typed tag) renders the
  // chip explicitly. AddressEntity intentionally skips category-only
  // tags as a title source, so without this the row would just show
  // the bare hash and the user would lose the visual proof of why it
  // matched the filter.
  const labelTags = withFallbackLabelIcons(item.metadata?.tags ?? []).filter((tag) => tag.tagType !== 'name');

  return (
    <TableRow>
      <TableCell py={ 3 } color="text.secondary" fontWeight={ 600 } whiteSpace="nowrap">
        <Skeleton loading={ isLoading } display="inline-block">
          { index }
        </Skeleton>
      </TableCell>
      <TableCell py={ 3 }>
        <AddressEntity
          address={ item }
          isLoading={ isLoading }
          fontWeight={ 700 }
          my="2px"
        />
      </TableCell>
      <TableCell py={ 3 } verticalAlign="middle">
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
      </TableCell>
      <TableCell py={ 3 } isNumeric>
        <NativeCoinValue
          amount={ item.coin_balance }
          noSymbol
          loading={ isLoading }
          lineHeight="24px"
        />
      </TableCell>
      <TableCell py={ 3 } isNumeric>
        <Skeleton loading={ isLoading } display="inline-block" lineHeight="24px">
          { Number(item.transactions_count).toLocaleString() }
        </Skeleton>
      </TableCell>
    </TableRow>
  );
};

export default React.memo(AddressesLabelSearchTableItem);
