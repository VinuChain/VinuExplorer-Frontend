import {
  Box,
  Flex,
  chakra,
} from '@chakra-ui/react';
import React from 'react';

import config from 'configs/app';
import useApiQuery from 'lib/api/useApiQuery';
import dayjs from 'lib/date/dayjs';
import { HOMEPAGE_STATS } from 'stubs/stats';
import { Alert } from 'toolkit/chakra/alert';
import { Heading } from 'toolkit/chakra/heading';
import { Skeleton } from 'toolkit/chakra/skeleton';
import GasTrackerChart from 'ui/gasTracker/GasTrackerChart';
import GasTrackerFaq from 'ui/gasTracker/GasTrackerFaq';
import GasTrackerFeelessStats from 'ui/gasTracker/GasTrackerFeelessStats';
import GasTrackerNetworkUtilization from 'ui/gasTracker/GasTrackerNetworkUtilization';
import GasTrackerPrices from 'ui/gasTracker/GasTrackerPrices';
import { enrichGasStats } from 'ui/shared/gas/enrichGasData';
import GasInfoUpdateTimer from 'ui/shared/gas/GasInfoUpdateTimer';
import NativeTokenIcon from 'ui/shared/NativeTokenIcon';
import PageTitle from 'ui/shared/Page/PageTitle';

const GasTracker = () => {
  const { data, isPlaceholderData, isError, error, dataUpdatedAt } = useApiQuery('general:stats', {
    queryOptions: {
      placeholderData: HOMEPAGE_STATS,
      refetchOnMount: false,
    },
  });

  if (isError) {
    throw new Error(undefined, { cause: error });
  }

  const isLoading = isPlaceholderData;
  const enrichedData = data ? enrichGasStats(data) : data;

  const titleSecondRow = (
    <Flex
      alignItems={{ base: 'flex-start', lg: 'center' }}
      fontFamily="heading"
      fontSize="lg"
      fontWeight={ 500 }
      w="100%"
      columnGap={ 3 }
      rowGap={ 1 }
      flexDir={{ base: 'column', lg: 'row' }}
    >
      { typeof enrichedData?.network_utilization_percentage === 'number' &&
        <GasTrackerNetworkUtilization percentage={ enrichedData.network_utilization_percentage } isLoading={ isLoading }/> }
      { enrichedData?.gas_price_updated_at && (
        <Skeleton loading={ isLoading } whiteSpace="pre" display="flex" alignItems="center">
          <span>Last updated </span>
          <chakra.span color="text.secondary">{ dayjs(enrichedData.gas_price_updated_at).format('DD MMM, HH:mm:ss') }</chakra.span>
          { enrichedData.gas_prices_update_in !== 0 && (
            <GasInfoUpdateTimer
              key={ dataUpdatedAt }
              startTime={ dataUpdatedAt }
              duration={ enrichedData.gas_prices_update_in }
              ml={ 2 }
            />
          ) }
        </Skeleton>
      ) }
      { enrichedData?.coin_price && (
        <Skeleton loading={ isLoading } ml={{ base: 0, lg: 'auto' }} whiteSpace="pre" display="flex" alignItems="center">
          <NativeTokenIcon mr={ 2 } boxSize={ 6 }/>
          <chakra.span color="text.secondary">{ config.chain.currency.symbol }</chakra.span>
          <span> ${ Number(enrichedData.coin_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) }</span>
        </Skeleton>
      ) }
    </Flex>
  );

  const snippets = (() => {
    if (!isPlaceholderData && enrichedData?.gas_prices?.slow === null && enrichedData?.gas_prices.average === null && enrichedData?.gas_prices.fast === null) {
      return <Alert status="warning">No recent data available</Alert>;
    }

    return enrichedData?.gas_prices ? <GasTrackerPrices prices={ enrichedData.gas_prices } isLoading={ isLoading }/> : null;
  })();

  const faq = config.meta.seo.enhancedDataEnabled ? <GasTrackerFaq/> : null;
  const heading = config.meta.seo.enhancedDataEnabled ?
    `Track ${ config.chain.name } gas and Payback refunds` :
    `Track ${ config.chain.name } gas fees`;

  return (
    <>
      <PageTitle
        title={ config.meta.seo.enhancedDataEnabled ? `${ config.chain.name } gas tracker` : 'Gas tracker' }
        secondRow={ titleSecondRow }
        withTextAd
      />
      <Heading level="2" mt={ 8 } mb={ 4 }>{ heading }</Heading>
      <GasTrackerFeelessStats
        totalFeeRefunded={ enrichedData?.total_fee_refunded }
        feelessTxPercentage={ enrichedData?.feeless_tx_percentage }
        isLoading={ isLoading }
      />
      { snippets }
      { config.features.stats.isEnabled && (
        <Box mt={ 12 } _empty={{ display: 'none' }}>
          <GasTrackerChart/>
        </Box>
      ) }
      { faq }
    </>
  );
};

export default GasTracker;
