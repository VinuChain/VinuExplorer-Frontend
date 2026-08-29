import { Flex } from '@chakra-ui/react';
import React from 'react';

import type { VinuEpoch } from 'types/api/vinuEpochs';

import { Skeleton } from 'toolkit/chakra/skeleton';
import ListItemMobile from 'ui/shared/ListItemMobile/ListItemMobile';
import TimeWithTooltip from 'ui/shared/time/TimeWithTooltip';

import { formatDuration, formatVc } from './formatEpoch';

interface Props {
  item: VinuEpoch;
  isLoading?: boolean;
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Flex justifyContent="space-between" columnGap={ 3 } w="full">
    <Skeleton loading={ false } color="text.secondary" flexShrink={ 0 }><span>{ label }</span></Skeleton>
    { children }
  </Flex>
);

const VinuEpochsListItem = ({ item, isLoading }: Props) => {
  return (
    <ListItemMobile rowGap={ 2 } py={ 3 } w="full" textStyle="sm" fontWeight={ 500 } alignItems="stretch">
      <Row label="Epoch">
        <Skeleton loading={ isLoading } fontWeight={ 700 }><span>{ item.number.toLocaleString() }</span></Skeleton>
      </Row>
      <Row label="Duration">
        <Skeleton loading={ isLoading } fontVariantNumeric="tabular-nums">
          <span>{ formatDuration(item.duration_seconds) }</span>
        </Skeleton>
      </Row>
      <Row label="End time">
        { item.end_time ? (
          <TimeWithTooltip timestamp={ item.end_time } isLoading={ isLoading }/>
        ) : (
          <Skeleton loading={ isLoading }><span>-</span></Skeleton>
        ) }
      </Row>
      <Row label="Total base reward weight">
        <Skeleton loading={ isLoading } fontVariantNumeric="tabular-nums">
          <span>{ formatVc(item.total_base_reward_weight, 0) } VC</span>
        </Skeleton>
      </Row>
      <Row label="Base reward / second">
        <Skeleton loading={ isLoading } fontVariantNumeric="tabular-nums">
          <span>{ formatVc(item.base_reward_per_second, 2) } VC</span>
        </Skeleton>
      </Row>
      <Row label="Total stake">
        <Skeleton loading={ isLoading } fontVariantNumeric="tabular-nums">
          <span>{ formatVc(item.total_stake, 0) } VC</span>
        </Skeleton>
      </Row>
      <Row label="Total supply">
        <Skeleton loading={ isLoading } fontVariantNumeric="tabular-nums">
          <span>{ formatVc(item.total_supply, 0) } VC</span>
        </Skeleton>
      </Row>
    </ListItemMobile>
  );
};

export default React.memo(VinuEpochsListItem);
