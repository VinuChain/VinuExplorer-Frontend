import { Flex, Box, Text } from '@chakra-ui/react';
import React from 'react';

import useApiQuery from 'lib/api/useApiQuery';
import { Skeleton } from 'toolkit/chakra/skeleton';
import { Tooltip } from 'toolkit/chakra/tooltip';

interface Props {
  hash: string;
}

const formatPct = (v: number | null | undefined): string => v == null ? '-' : v.toFixed(2) + '%';
const formatGini = (v: number | null | undefined): string => v == null ? '-' : v.toFixed(4);

interface TileProps {
  label: string;
  value: string;
  tooltip?: string;
  isLoading?: boolean;
}

const Tile = ({ label, value, tooltip, isLoading }: TileProps) => {
  const body = (
    <Box
      bg="bg.primary"
      borderWidth="1px"
      borderColor="border.divider"
      borderRadius="md"
      px={ 4 }
      py={ 3 }
      minW={{ base: '140px', md: '170px' }}
      flex={ 1 }
    >
      <Text fontSize="xs" color="text.secondary" mb={ 1 }>{ label }</Text>
      <Skeleton loading={ isLoading } display="inline-block">
        <Text fontWeight="700" fontSize="lg">{ value }</Text>
      </Skeleton>
    </Box>
  );
  return tooltip ? <Tooltip content={ tooltip } interactive={ false }>{ body }</Tooltip> : body;
};

const TokenHoldersConcentration = ({ hash }: Props) => {
  const query = useApiQuery('general:token_holders_distribution', { pathParams: { hash } });

  if (query.isError) return null;
  const data = query.data;

  return (
    <Flex gap={ 3 } flexWrap="wrap" mb={ 4 }>
      <Tile label="Top 100" value={ formatPct(data?.top100_percentage) } isLoading={ query.isLoading }/>
      <Tile label="Top 10" value={ formatPct(data?.top10_percentage) } isLoading={ query.isLoading }/>
      <Tile label="Whale (≥1%)" value={ data == null ? '-' : data.whale_holders_count.toLocaleString() } isLoading={ query.isLoading }/>
      <Tile label="Gini" value={ formatGini(data?.gini_coefficient) } tooltip="0 = perfect equality, 1 = total inequality" isLoading={ query.isLoading }/>
    </Flex>
  );
};

export default TokenHoldersConcentration;
