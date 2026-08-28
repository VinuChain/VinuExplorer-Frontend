import { Grid } from '@chakra-ui/react';
import BigNumber from 'bignumber.js';
import React from 'react';

import config from 'configs/app';
import StatsWidget from 'ui/shared/stats/StatsWidget';
import { WEI } from 'ui/shared/value/utils';

type Props = {
  totalFeeRefunded?: string | null;
  feelessTxPercentage?: number | null;
  isLoading: boolean;
};

type StatItem = {
  id: string;
  label: string;
  value: string;
  hint: string;
};

const GasTrackerFeelessStats = ({ totalFeeRefunded, feelessTxPercentage, isLoading }: Props) => {
  const hasFeelessTxPercentage = feelessTxPercentage != null;
  const hasTotalFeeRefunded = totalFeeRefunded != null;

  if (!isLoading && !hasFeelessTxPercentage && !hasTotalFeeRefunded) {
    return null;
  }

  const nativeSymbol = config.chain.currency.symbol;
  const totalRefunded = totalFeeRefunded != null ? BigNumber(totalFeeRefunded).div(WEI).dp(2).toFormat() : '0';
  const hasRefunds = totalFeeRefunded != null && BigNumber(totalFeeRefunded).gt(0);

  const items: Array<StatItem> = [];

  if (hasFeelessTxPercentage || isLoading) {
    items.push({
      id: 'feeless-transactions',
      label: 'Feeless transactions',
      // Backend rounds to 2 dp, so 0 means "< 0.005%", not "none" - say so when refunds exist.
      value: hasFeelessTxPercentage && feelessTxPercentage < 0.005 && hasRefunds ?
        '<0.01%' :
        `${ (feelessTxPercentage ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 }) }%`,
      hint: 'All-time share of transactions that received a full or partial Payback refund.',
    });
  }

  if (hasTotalFeeRefunded || isLoading) {
    items.push({
      id: 'total-refunded',
      label: 'Total refunded',
      value: `${ totalRefunded }${ nativeSymbol ? ` ${ nativeSymbol }` : '' }`,
      hint: 'Cumulative transaction fees returned through Payback quota.',
    });
  }

  if (hasFeelessTxPercentage || hasTotalFeeRefunded || isLoading) {
    items.push({
      id: 'net-fee-model',
      label: 'Net fee model',
      value: 'Payback quota',
      hint: 'Payback can refund all or part of the gross gas fee, so transactions can be Gas-Free or Quota-Subsidized.',
    });
  }

  return (
    <Grid
      gridTemplateColumns={{ base: '1fr', lg: `repeat(${ items.length }, minmax(0, 1fr))` }}
      gap={{ base: 2, lg: 3 }}
      mb={ 6 }
    >
      { items.map((item) => (
        <StatsWidget
          key={ item.id }
          icon="gas"
          label={ item.label }
          value={ item.value }
          hint={ item.hint }
          isLoading={ isLoading }
        />
      )) }
    </Grid>
  );
};

export default GasTrackerFeelessStats;
