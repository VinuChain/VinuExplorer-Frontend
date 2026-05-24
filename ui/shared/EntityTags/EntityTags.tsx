import { Box, Flex, chakra } from '@chakra-ui/react';
import React from 'react';

import type { EntityTag as TEntityTag } from './types';

import config from 'configs/app';
import useIsMobile from 'lib/hooks/useIsMobile';
import { Badge } from 'toolkit/chakra/badge';
import { PopoverBody, PopoverContent, PopoverRoot, PopoverTrigger } from 'toolkit/chakra/popover';

import EntityTag from './EntityTag';
import { getCategoryLabel, isCategoryTagType, withFallbackLabelIcons } from './utils';

interface Props {
  className?: string;
  tags: Array<TEntityTag>;
  addressHash?: string;
  isLoading?: boolean;
}

interface ExpandedChip {
  tag: TEntityTag;
  renderMode: 'name' | 'category';
  key: string;
}

// Category-type tags carry two pieces of identity: the SPECIFIC name
// the submitter chose ("VIR/VIN LP") and the CATEGORY the address
// belongs to ("Liquidity Pool"). The user-facing distinction the
// product expresses is: Tag = the specific identity, Label = the
// browsable category. Expand category-typed tags that have a name into
// two chips so both appear side-by-side in the page header.
//
// Skip the redundant Tag chip when the submitter named the tag the
// same as the category label itself (e.g., a project tag whose name
// is "Project"). Rendering both chips in that case produces two
// identical badges; the single Label chip carries the same meaning.
function expandTags(tags: Array<TEntityTag>): Array<ExpandedChip> {
  return tags.flatMap((tag) => {
    if (isCategoryTagType(tag.tagType) && tag.name) {
      const categoryLabel = getCategoryLabel(tag.tagType);
      if (categoryLabel && tag.name.trim().toLowerCase() === categoryLabel.toLowerCase()) {
        return [ { tag, renderMode: 'category' as const, key: tag.slug } ];
      }
      return [
        { tag, renderMode: 'name' as const, key: `${ tag.slug }-name` },
        { tag, renderMode: 'category' as const, key: `${ tag.slug }-category` },
      ];
    }
    return [ { tag, renderMode: 'category' as const, key: tag.slug } ];
  });
}

const EntityTags = ({ tags, addressHash, className, isLoading }: Props) => {
  const isMobile = useIsMobile();
  const visibleNum = isMobile ? 2 : 3;

  const metaSuitesPlaceholder = config.features.metasuites.isEnabled ?
    <Box display="none" id="meta-suites__address-tag" data-ready={ !isLoading }/> :
    null;

  const chips = React.useMemo(() => expandTags(withFallbackLabelIcons(tags)), [ tags ]);

  if (chips.length === 0) {
    return metaSuitesPlaceholder;
  }

  const tagMaxW = (() => {
    if (chips.length === 1) {
      return { base: '100%', lg: '300px' };
    }

    if (chips.length === 2) {
      return { base: 'calc((100% - 8px) / 2)', lg: '300px' };
    }
    return { base: 'calc((100% - 40px) / 2)', lg: '300px' };
  })();

  const content = (() => {
    if (chips.length > visibleNum) {
      return (
        <>
          { chips.slice(0, visibleNum).map(({ tag, renderMode, key }) => (
            <EntityTag
              key={ key }
              data={ tag }
              addressHash={ addressHash }
              isLoading={ isLoading }
              renderMode={ renderMode }
              maxW={ tagMaxW }
            />
          )) }
          { metaSuitesPlaceholder }
          <PopoverRoot>
            <PopoverTrigger>
              <Badge loading={ isLoading } cursor="pointer" as="button" _hover={{ color: 'hover' }}>
                +{ chips.length - visibleNum }
              </Badge>
            </PopoverTrigger>
            <PopoverContent maxW="300px" w="fit-content">
              <PopoverBody>
                <Flex columnGap={ 2 } rowGap={ 2 } flexWrap="wrap">
                  { chips.slice(visibleNum).map(({ tag, renderMode, key }) => (
                    <EntityTag key={ key } data={ tag } addressHash={ addressHash } renderMode={ renderMode }/>
                  )) }
                </Flex>
              </PopoverBody>
            </PopoverContent>
          </PopoverRoot>
        </>
      );
    }

    return (
      <>
        { chips.map(({ tag, renderMode, key }) => (
          <EntityTag
            key={ key }
            data={ tag }
            addressHash={ addressHash }
            isLoading={ isLoading }
            renderMode={ renderMode }
            maxW={ tagMaxW }
          />
        )) }
        { metaSuitesPlaceholder }
      </>
    );
  })();

  return (
    <Flex className={ className } columnGap={ 2 } rowGap={ 2 } flexWrap="nowrap" alignItems="center" flexGrow={ 1 } maxW="100%" overflow="hidden">
      { content }
    </Flex>
  );
};

export default React.memo(chakra(EntityTags));
