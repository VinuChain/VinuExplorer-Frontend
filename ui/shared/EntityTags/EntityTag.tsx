import { Flex, type HTMLChakraProps } from '@chakra-ui/react';
import React from 'react';

import type { EntityTag as TEntityTag } from './types';

import { route } from 'nextjs-routes';

import appConfig from 'configs/app';
import { useMultichainContext } from 'lib/contexts/multichain';
import * as mixpanel from 'lib/mixpanel/index';
import { Link, LinkExternalIcon } from 'toolkit/chakra/link';
import { Skeleton } from 'toolkit/chakra/skeleton';
import { Tag } from 'toolkit/chakra/tag';
import { Tooltip } from 'toolkit/chakra/tooltip';
import IconSvg from 'ui/shared/IconSvg';

import EntityTagIcon from './EntityTagIcon';
import EntityTagTooltip from './EntityTagTooltip';
import FittedTagName from './FittedTagName';
import { getCategoryLabel, getTagLinkParams, getTagName } from './utils';

interface Props extends HTMLChakraProps<'span'> {
  data: TEntityTag;
  addressHash?: string;
  isLoading?: boolean;
  noLink?: boolean;
  // 'category' (default) — for category-only tag types, render the
  // human category label ("Liquidity Pool" / "Exchange" / ...) so the
  // badge communicates the entity class rather than re-displaying a
  // name that AddressEntity already shows in the adjacent cell.
  // 'name' — always render the tag's specific name. Used by callers
  // that have already filtered to one specific tag (e.g., the search
  // result summary on /accounts/label/[slug]).
  renderMode?: 'name' | 'category';
}

const EntityTag = ({ data, addressHash, isLoading, noLink, renderMode = 'category', maxW, ...rest }: Props) => {
  const multichainContext = useMultichainContext();

  const linkParams = !noLink ? getTagLinkParams(data, multichainContext, renderMode) : undefined;
  const hasLink = Boolean(linkParams);
  const iconColor = data.meta?.textColor ?? 'icon.secondary';

  const handleLinkClick = React.useCallback(() => {
    if (!linkParams?.href) {
      return;
    }

    mixpanel.logEvent(mixpanel.EventTypes.PAGE_WIDGET, {
      Type: 'Address tag',
      Info: data.slug,
      URL: linkParams.href,
    });
  }, [ linkParams?.href, data.slug ]);

  if (isLoading) {
    return <Skeleton loading borderRadius="sm" w="100px" h="24px"/>;
  }

  const canRequestUpdate =
    data.tagType === 'name' &&
    Boolean(addressHash) &&
    appConfig.features.account.isEnabled &&
    appConfig.features.publicTagsSubmission.isEnabled;

  const text = (() => {
    if (data.meta?.warpcastHandle) {
      return `@${ data.meta.warpcastHandle }`;
    }

    if (renderMode === 'category') {
      const categoryLabel = getCategoryLabel(data.tagType);
      if (categoryLabel) {
        return categoryLabel;
      }
    }

    return getTagName(data, addressHash);
  })();

  const tag = (
    <EntityTagTooltip data={ data }>
      <Link
        external={ linkParams?.type === 'external' }
        href={ linkParams?.href }
        onClick={ handleLinkClick }
        noIcon
        cursor={ hasLink ? 'pointer' : 'default' }
        maxW={ canRequestUpdate ? '100%' : maxW }
        minW={ canRequestUpdate ? 0 : undefined }
        { ...rest }
      >
        <Tag
          bg={ data.meta?.bgColor }
          color={ data.meta?.textColor }
          startElement={ <EntityTagIcon data={ data }/> }
          endElement={ linkParams?.type === 'external' ? <LinkExternalIcon color={ iconColor }/> : null }
          endElementProps={ linkParams?.type === 'external' ? { ml: -1 } : undefined }
          _hover={ hasLink ? { opacity: 0.76 } : undefined }
          variant={ hasLink ? 'clickable' : 'subtle' }
        >
          <FittedTagName text={ text }/>
        </Tag>
      </Link>
    </EntityTagTooltip>
  );

  if (!canRequestUpdate || !addressHash) {
    return tag;
  }

  const updateHref = route({
    pathname: '/public-tags/submit',
    query: {
      submissionType: 'update',
      address: addressHash,
      tagLabel: data.slug,
      tagName: data.name,
    },
  });

  return (
    <Flex
      as="span"
      display="inline-flex"
      alignItems="center"
      gap={ 1 }
      minW={ 0 }
      maxW={ maxW }
      data-testid="entity-tag-with-update"
    >
      <Flex as="span" minW={ 0 } flex="1 1 auto" overflow="hidden">
        { tag }
      </Flex>
      <Tooltip content={ `Request an update to ${ data.name }` } disableOnMobile>
        <Link
          href={ updateHref }
          aria-label={ `Request an update to ${ data.name }` }
          color="icon.secondary"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={ 0 }
          boxSize={ 11 }
          borderRadius="sm"
          _hover={{ color: 'link.primary' }}
          _focusVisible={{ outline: '2px solid', outlineColor: 'focus' }}
          noIcon
          data-testid="public-tag-update-link"
        >
          <IconSvg name="edit" boxSize={ 3 }/>
        </Link>
      </Tooltip>
    </Flex>
  );
};

export default React.memo(EntityTag);
