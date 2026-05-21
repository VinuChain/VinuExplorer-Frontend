import { Grid, Text, Flex } from '@chakra-ui/react';
import React from 'react';

import type { ItemsProps } from './types';
import type { SearchResultLabel } from 'types/api/search';

import { toBech32Address } from 'lib/address/bech32';
import highlightText from 'lib/highlightText';
import HashStringShortenDynamic from 'ui/shared/HashStringShortenDynamic';
import IconSvg from 'ui/shared/IconSvg';

const SearchBarSuggestLabel = ({ data, isMobile, searchTerm, addressFormat }: ItemsProps<SearchResultLabel>) => {
  const icon = <IconSvg name="publictags_slim" boxSize={ 5 } color="icon.primary"/>;
  const hash = data.filecoin_robust_address || (addressFormat === 'bech32' ? toBech32Address(data.address_hash) : data.address_hash);

  const meta = data.metadata;
  const hasBadgeStyling = Boolean(meta?.bgColor || meta?.textColor);

  const nameInner = <span dangerouslySetInnerHTML={{ __html: highlightText(data.name, searchTerm) }}/>;
  const name = hasBadgeStyling ? (
    <Text
      as="span"
      display="inline-block"
      px={ 2 }
      py="2px"
      borderRadius="sm"
      bg={ meta?.bgColor || 'gray.200' }
      color={ meta?.textColor || 'inherit' }
      fontWeight={ 600 }
      fontSize="xs"
      overflow="hidden"
      whiteSpace="nowrap"
      textOverflow="ellipsis"
    >
      { nameInner }
    </Text>
  ) : (
    <Text
      fontWeight={ 700 }
      overflow="hidden"
      whiteSpace="nowrap"
      textOverflow="ellipsis"
    >
      { nameInner }
    </Text>
  );

  const address = (
    <Text
      overflow="hidden"
      whiteSpace="nowrap"
      color="text.secondary"
    >
      <HashStringShortenDynamic hash={ hash } noTooltip/>
    </Text>
  );

  const isContractVerified = data.is_smart_contract_verified && <IconSvg name="status/success" boxSize="14px" color="green.500" flexShrink={ 0 }/>;

  if (isMobile) {
    return (
      <>
        <Flex alignItems="center" overflow="hidden" gap={ 2 }>
          { icon }
          { name }
        </Flex>
        <Flex alignItems="center" overflow="hidden" gap={ 1 }>
          { address }
          { isContractVerified }
        </Flex>
      </>
    );
  }

  return (
    <Grid alignItems="center" gridTemplateColumns="228px max-content 24px" gap={ 2 }>
      <Flex alignItems="center" gap={ 2 }>
        { icon }
        { name }
      </Flex>
      <Flex alignItems="center" overflow="hidden" gap={ 1 }>
        { address }
        { isContractVerified }
      </Flex>
    </Grid>
  );
};

export default React.memo(SearchBarSuggestLabel);
