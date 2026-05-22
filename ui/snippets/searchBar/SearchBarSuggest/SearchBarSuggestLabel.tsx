import { Grid, Text, Flex } from '@chakra-ui/react';
import React from 'react';

import type { ItemsProps } from './types';
import type { SearchResultLabel } from 'types/api/search';

import { toBech32Address } from 'lib/address/bech32';
import highlightText from 'lib/highlightText';
import { Image } from 'toolkit/chakra/image';
import HashStringShortenDynamic from 'ui/shared/HashStringShortenDynamic';
import IconSvg from 'ui/shared/IconSvg';

const SearchBarSuggestLabel = ({ data, isMobile, searchTerm, addressFormat }: ItemsProps<SearchResultLabel>) => {
  const meta = data.metadata;
  const hash = data.filecoin_robust_address || (addressFormat === 'bech32' ? toBech32Address(data.address_hash) : data.address_hash);

  // Prefer the tag's uploaded logo over the generic publictags glyph
  // — matches the same swap AddressEntity.Icon does for the row view.
  // Pass the glyph as `fallback` so broken / expired / CORS-blocked
  // tag-icon URLs degrade to the previous visual instead of leaving
  // the suggest row with a blank icon slot.
  const tagIconGlyphFallback = <IconSvg name="publictags_slim" boxSize={ 5 } color="icon.primary"/>;
  const icon = meta?.tagIcon ? (
    <Image
      src={ meta.tagIcon }
      alt={ `${ data.name } icon` }
      boxSize="20px"
      borderRadius="full"
      objectFit="cover"
      flexShrink={ 0 }
      fallback={ tagIconGlyphFallback }
    />
  ) : tagIconGlyphFallback;

  // Only render a badge backdrop when BOTH bgColor and textColor are
  // supplied. The previous code rendered a hard-coded gray.200 bg as
  // a fallback when only one color was set, which read as a
  // washed-out "negative" pill (especially for tags that uploaded
  // only a textColor) and didn't adapt to dark mode. With this guard
  // a single-color payload falls back to plain text using the
  // submitter's textColor as a tint when present.
  const hasBadgeStyling = Boolean(meta?.bgColor && meta?.textColor);

  const nameInner = <span dangerouslySetInnerHTML={{ __html: highlightText(data.name, searchTerm) }}/>;
  const name = hasBadgeStyling ? (
    <Text
      as="span"
      display="inline-block"
      px={ 2 }
      py="2px"
      borderRadius="sm"
      bg={ meta?.bgColor }
      color={ meta?.textColor }
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
      color={ meta?.textColor || undefined }
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
