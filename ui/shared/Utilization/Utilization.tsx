import type { HTMLChakraProps } from '@chakra-ui/react';
import { Box, Flex } from '@chakra-ui/react';
import { clamp } from 'es-toolkit';
import React from 'react';

import { Skeleton } from 'toolkit/chakra/skeleton';

interface Props extends Omit<HTMLChakraProps<'div'>, 'direction'> {
  value: number;
  colorScheme?: 'green' | 'gray';
  isLoading?: boolean;
}

const WIDTH = 50;

const Utilization = ({ value, colorScheme = 'green', isLoading, ...rest }: Props, ref: React.Ref<HTMLDivElement>) => {
  const valueString = (clamp(value * 100 || 0, 0, 100)).toLocaleString(undefined, { maximumFractionDigits: 2 }) + '%';
  // The bar and the label had one colour. green.500 is fine for the bar - a
  // graphic needs 3:1 under WCAG 1.4.11 and it measures 3.24:1 - but the label
  // is text and needs 4.5:1, which is why it was the last color-contrast node
  // axe reported on the live block page. text.success is 6.42:1 in light mode
  // and stays light-on-dark in dark mode, so only the label moves.
  const barColor = colorScheme === 'gray' ? 'text.secondary' : 'green.500';
  const labelColor = colorScheme === 'gray' ? 'text.secondary' : 'text.success';

  return (
    <Flex alignItems="center" columnGap={ 2 } { ...rest } ref={ ref }>
      <Skeleton loading={ isLoading } w={ `${ WIDTH }px` } h="4px" borderRadius="full" overflow="hidden">
        <Box bg={{ _light: 'blackAlpha.200', _dark: 'whiteAlpha.200' }} h="100%">
          <Box bg={ barColor } w={ valueString } h="100%"/>
        </Box>
      </Skeleton>
      <Skeleton loading={ isLoading } color={ labelColor } fontWeight="bold">
        <span>
          { valueString }
        </span>
      </Skeleton>
    </Flex>
  );
};

export default React.memo(React.forwardRef(Utilization));
