import { Text } from '@chakra-ui/react';
import React from 'react';

interface Props {
  loadedCount: number | undefined;
  totalCount: number | undefined;
}

const TokenHoldersSummaryLine = ({ loadedCount, totalCount }: Props) => {
  if (!totalCount) return null;
  if (!loadedCount || loadedCount >= totalCount) {
    return (
      <Text color="text_secondary" fontSize="sm" my={ 2 }>
        { totalCount.toLocaleString() } holders
      </Text>
    );
  }
  return (
    <Text color="text_secondary" fontSize="sm" my={ 2 }>
      Top { loadedCount.toLocaleString() } holders (from a total of { totalCount.toLocaleString() } holders)
    </Text>
  );
};

export default TokenHoldersSummaryLine;
