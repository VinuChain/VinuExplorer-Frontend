import { Box, Flex, Text } from '@chakra-ui/react';
import React from 'react';

import useApiQuery from 'lib/api/useApiQuery';

interface Props {
  hash: string;
}

const TokenHoldersDistribution = ({ hash }: Props) => {
  const query = useApiQuery('general:token_holders_distribution', { pathParams: { hash } });

  if (query.isError) return null;
  if (query.isLoading) return <Text color="text.secondary">Loading...</Text>;
  const buckets = query.data?.value_buckets ?? [];

  if (buckets.length === 0) {
    return <Text color="text.secondary">Value distribution unavailable for this token (no USD price feed).</Text>;
  }

  const maxCount = Math.max(...buckets.map((b) => b.holder_count), 1);

  return (
    <Box>
      { buckets.map((bucket) => {
        const widthPct = (bucket.holder_count / maxCount) * 100;
        return (
          <Flex key={ bucket.label } gap={ 3 } py={ 2 } alignItems="center">
            <Box w="100px" fontSize="sm" color="text.secondary">{ bucket.label }</Box>
            <Box flex={ 1 } position="relative" h="20px" bg="border.divider" borderRadius="sm">
              <Box
                position="absolute"
                left={ 0 }
                top={ 0 }
                h="100%"
                w={ `${ widthPct }%` }
                bg="green.400"
                borderRadius="sm"
              />
            </Box>
            <Box w="80px" textAlign="right" fontWeight="600" fontSize="sm">
              { bucket.holder_count.toLocaleString() }
            </Box>
          </Flex>
        );
      }) }
    </Box>
  );
};

export default TokenHoldersDistribution;
