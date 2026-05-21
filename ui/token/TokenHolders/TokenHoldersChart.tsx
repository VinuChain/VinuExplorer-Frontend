import { Box, Flex, Text } from '@chakra-ui/react';
import React, { useCallback } from 'react';

import useApiQuery from 'lib/api/useApiQuery';
import { Button } from 'toolkit/chakra/button';

export const CHART_PERIODS = [ '24h', '7d', '30d', '90d' ] as const;
export type ChartPeriod = typeof CHART_PERIODS[number];
export const DEFAULT_CHART_PERIOD: ChartPeriod = '30d';

interface Props {
  hash: string;
  // `period` + `onChangePeriod` are lifted into TokenHolders so the
  // sibling CSV-export link can mirror the selected window.
  period: ChartPeriod;
  onChangePeriod: (period: ChartPeriod) => void;
}

interface PeriodButtonProps {
  period: ChartPeriod;
  isActive: boolean;
  onSelect: (period: ChartPeriod) => void;
}

const PeriodButton = ({ period, isActive, onSelect }: PeriodButtonProps) => {
  const handleClick = useCallback(() => onSelect(period), [ period, onSelect ]);
  return (
    <Button
      size="sm"
      variant={ isActive ? 'solid' : 'ghost' }
      onClick={ handleClick }
      aria-pressed={ isActive }
    >
      { period }
    </Button>
  );
};

const TokenHoldersChart = ({ hash, period, onChangePeriod }: Props) => {
  const query = useApiQuery('general:token_holders_chart', {
    pathParams: { hash },
    queryParams: { period },
  });

  return (
    <Box>
      <Flex gap={ 2 } mb={ 3 }>
        { CHART_PERIODS.map((p) => (
          <PeriodButton key={ p } period={ p } isActive={ period === p } onSelect={ onChangePeriod }/>
        )) }
      </Flex>
      { query.isError && <Text color="text.secondary">Holder count history is being computed.</Text> }
      { query.isLoading && <Text color="text.secondary">Loading...</Text> }
      { query.data && query.data.items.length === 0 && (
        <Text color="text.secondary">No holder count history yet for the selected period.</Text>
      ) }
      { query.data && query.data.items.length > 0 && (
        <Box maxH="320px" overflowY="auto">
          { query.data.items.map((point) => (
            <Flex
              key={ point.day }
              gap={ 4 }
              py={ 1 }
              borderBottomWidth="1px"
              borderColor="border.divider"
            >
              <Box w="120px" fontSize="sm" color="text.secondary">{ point.day }</Box>
              <Box fontWeight="600">{ point.holder_count.toLocaleString() } holders</Box>
            </Flex>
          )) }
        </Box>
      ) }
    </Box>
  );
};

export default TokenHoldersChart;
