import { chakra, HStack, VStack } from '@chakra-ui/react';
import React from 'react';

import type { PublicTagApplicationRow } from 'types/api/publicTagSubmissions';

import { Image } from 'toolkit/chakra/image';
import { Tooltip } from 'toolkit/chakra/tooltip';

interface Props {
  item: Pick<PublicTagApplicationRow, 'tag_name' | 'meta'>;
  size?: 'sm' | 'md';
}

// Renders the visual the submitter requested for the tag chip — same
// bg/text color, optional logo, optional tooltip. Falls back to a
// neutral chip when meta is missing or empty so the column never
// renders as blank.
const PublicTagApplicationPreview = ({ item, size = 'md' }: Props) => {
  const meta = item.meta ?? {};
  const bgColor = meta.bgColor || 'rgba(127, 127, 127, 0.12)';
  const textColor = meta.textColor || 'inherit';
  const iconUrl = meta.tagIcon?.trim() || undefined;
  const tooltip = meta.tooltipDescription?.trim() || undefined;
  const projectUrl = meta.tagUrl?.trim() || undefined;

  const chipFontSize = size === 'sm' ? 'xs' : 'sm';
  const chipPadding = size === 'sm' ? '2px 8px' : '3px 10px';
  const iconSize = size === 'sm' ? '14px' : '16px';

  const chip = (
    <chakra.span
      display="inline-flex"
      alignItems="center"
      gap="6px"
      padding={ chipPadding }
      borderRadius="9999px"
      background={ bgColor }
      color={ textColor }
      fontSize={ chipFontSize }
      fontWeight={ 600 }
      lineHeight="1.4"
      maxW="100%"
    >
      { iconUrl ? (
        <Image
          src={ iconUrl }
          alt=""
          boxSize={ iconSize }
          borderRadius="full"
          background="white"
          flexShrink={ 0 }
          // Hide on load error so a 404 logo doesn't render the
          // browser's broken-image glyph next to the label. The toolkit
          // Image component swaps in `fallback` when src fails.
          fallback={ null }
        />
      ) : null }
      <chakra.span overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
        { item.tag_name }
      </chakra.span>
    </chakra.span>
  );

  const chipWithTooltip = tooltip ? <Tooltip content={ tooltip }>{ chip }</Tooltip> : chip;

  if (!projectUrl) {
    return chipWithTooltip;
  }

  // Project URL surfaces below the chip so the moderator UI parity
  // (email + confirm page) extends to the submitter's view of their
  // own request.
  return (
    <VStack align="flex-start" gap={ 1 }>
      <HStack gap={ 2 } align="center">{ chipWithTooltip }</HStack>
      <chakra.a
        href={ projectUrl }
        target="_blank"
        rel="noopener noreferrer"
        fontSize="xs"
        color="link.primary"
        textDecoration="underline"
        wordBreak="break-all"
      >
        { projectUrl }
      </chakra.a>
    </VStack>
  );
};

export default React.memo(PublicTagApplicationPreview);
