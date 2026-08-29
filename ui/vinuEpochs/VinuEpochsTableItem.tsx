import React from 'react';

import type { VinuEpoch } from 'types/api/vinuEpochs';

import { Skeleton } from 'toolkit/chakra/skeleton';
import { TableCell, TableRow } from 'toolkit/chakra/table';
import TimeWithTooltip from 'ui/shared/time/TimeWithTooltip';

import { formatDuration, formatVc } from './formatEpoch';

interface Props {
  item: VinuEpoch;
  isLoading?: boolean;
}

const VinuEpochsTableItem = ({ item, isLoading }: Props) => {
  return (
    <TableRow>
      <TableCell verticalAlign="middle">
        <Skeleton loading={ isLoading } fontWeight={ 700 }>
          <span>{ item.number.toLocaleString() }</span>
        </Skeleton>
      </TableCell>
      <TableCell verticalAlign="middle">
        <Skeleton loading={ isLoading } fontVariantNumeric="tabular-nums">
          <span>{ formatDuration(item.duration_seconds) }</span>
        </Skeleton>
      </TableCell>
      <TableCell verticalAlign="middle">
        { item.end_time ? (
          <TimeWithTooltip timestamp={ item.end_time } isLoading={ isLoading }/>
        ) : (
          <Skeleton loading={ isLoading }><span>-</span></Skeleton>
        ) }
      </TableCell>
      <TableCell verticalAlign="middle" isNumeric>
        <Skeleton loading={ isLoading } fontVariantNumeric="tabular-nums">
          <span>{ formatVc(item.total_base_reward_weight, 0) } VC</span>
        </Skeleton>
      </TableCell>
      <TableCell verticalAlign="middle" isNumeric>
        <Skeleton loading={ isLoading } fontVariantNumeric="tabular-nums">
          <span>{ formatVc(item.base_reward_per_second, 2) } VC</span>
        </Skeleton>
      </TableCell>
      <TableCell verticalAlign="middle" isNumeric>
        <Skeleton loading={ isLoading } fontVariantNumeric="tabular-nums">
          <span>{ formatVc(item.total_stake, 0) } VC</span>
        </Skeleton>
      </TableCell>
      <TableCell verticalAlign="middle" isNumeric>
        <Skeleton loading={ isLoading } fontVariantNumeric="tabular-nums">
          <span>{ formatVc(item.total_supply, 0) } VC</span>
        </Skeleton>
      </TableCell>
    </TableRow>
  );
};

export default React.memo(VinuEpochsTableItem);
