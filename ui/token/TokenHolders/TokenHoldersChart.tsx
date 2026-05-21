import { Box, Flex, Text } from '@chakra-ui/react';
import React, { useCallback, useState } from 'react';

import useApiQuery from 'lib/api/useApiQuery';
import { Button } from 'toolkit/chakra/button';

interface Props {
  hash: string;
}

const PERIODS = [ '24h', '7d', '30d', '90d' ] as const;
type Period = typeof PERIODS[number];

interface PeriodButtonProps {
  period: Period;
  isActive: boolean;
  onSelect: (period: Period) => void;
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

const TokenHoldersChart = ({ hash }: Props) => {
  const [ period, setPeriod ] = useState<Period>('30d');
  const query = useApiQuery('general:token_holders_chart', {
    pathParams: { hash },
    queryParams: { period },
  });

  return (
    <Box>
      <Flex gap={ 2 } mb={ 3 }>
        { PERIODS.map((p) => (
          <PeriodButton key={ p } period={ p } isActive={ period === p } onSelect={ setPeriod }/>
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
