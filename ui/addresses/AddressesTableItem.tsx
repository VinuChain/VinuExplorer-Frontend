import BigNumber from 'bignumber.js';
import React from 'react';

import type { AddressesItem } from 'types/api/addresses';

import config from 'configs/app';
import { Skeleton } from 'toolkit/chakra/skeleton';
import { TableCell, TableRow } from 'toolkit/chakra/table';
import AddressEntity from 'ui/shared/entities/address/AddressEntity';
import EntityTag from 'ui/shared/EntityTags/EntityTag';
import { withFallbackLabelIcons } from 'ui/shared/EntityTags/utils';
import SimpleValue from 'ui/shared/value/SimpleValue';

type Props = {
  item: AddressesItem;
  index: number;
  totalSupply: BigNumber;
  hasPercentage: boolean;
  isLoading?: boolean;
};

const AddressesTableItem = ({
  item,
  index,
  totalSupply,
  hasPercentage,
  isLoading,
}: Props) => {

  const addressBalance = BigNumber(item.coin_balance || 0).div(BigNumber(10 ** config.chain.currency.decimals));
  const labelTags = withFallbackLabelIcons(item.metadata?.tags ?? []).filter(t => t.tagType !== 'name' && t.tagType !== 'generic');

  return (
    <TableRow>
      <TableCell>
        <Skeleton loading={ isLoading } display="inline-block" minW={ 6 } lineHeight="24px">
          { index }
        </Skeleton>
      </TableCell>
      <TableCell>
        <AddressEntity
          address={ item }
          isLoading={ isLoading }
          fontWeight={ 700 }
          my="2px"
        />
      </TableCell>
      <TableCell verticalAlign="middle">
        { labelTags.map(tag => (
          <EntityTag
            key={ tag.slug }
            data={ tag }
            addressHash={ item.hash }
            isLoading={ isLoading }
            mr={ 1 }
            mb={ 1 }
          />
        )) }
      </TableCell>
      <TableCell isNumeric>
        <SimpleValue
          value={ addressBalance }
          loading={ isLoading }
          lineHeight="24px"
        />
      </TableCell>
      { hasPercentage && (
        <TableCell isNumeric>
          <SimpleValue
            value={ addressBalance.div(totalSupply).multipliedBy(100) }
            loading={ isLoading }
            postfix="%"
            lineHeight="24px"
          />
        </TableCell>
      ) }
      <TableCell isNumeric>
        <Skeleton loading={ isLoading } display="inline-block" lineHeight="24px">
          { Number(item.transactions_count).toLocaleString() }
        </Skeleton>
      </TableCell>
    </TableRow>
  );
};

export default React.memo(AddressesTableItem);
