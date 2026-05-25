import { Box, chakra, Flex } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import React from 'react';

import type { EntityTag as TEntityTag, EntityTagType } from 'ui/shared/EntityTags/types';

import useAddressesMetadata from 'lib/address/useAddressesMetadata';
import getQueryParamString from 'lib/router/getQueryParamString';
import { TOP_ADDRESS } from 'stubs/address';
import { TOKEN_INFO_ERC_20 } from 'stubs/token';
import { generateListStub } from 'stubs/utils';
import { Link } from 'toolkit/chakra/link';
import { Skeleton } from 'toolkit/chakra/skeleton';
import AddressesLabelSearchListItem from 'ui/addressesLabelSearch/AddressesLabelSearchListItem';
import AddressesLabelSearchTable from 'ui/addressesLabelSearch/AddressesLabelSearchTable';
import TokenLabelSearchListItem from 'ui/addressesLabelSearch/TokenLabelSearchListItem';
import TokenLabelSearchTable from 'ui/addressesLabelSearch/TokenLabelSearchTable';
import { ACTION_BAR_HEIGHT_DESKTOP } from 'ui/shared/ActionBar';
import DataListDisplay from 'ui/shared/DataListDisplay';
import EntityTag from 'ui/shared/EntityTags/EntityTag';
import { CATEGORY_BROWSE_SLUG, withFallbackLabelIcons } from 'ui/shared/EntityTags/utils';
import PageTitle from 'ui/shared/Page/PageTitle';
import useQueryWithPages from 'ui/shared/pagination/useQueryWithPages';
import StickyPaginationWithText from 'ui/shared/StickyPaginationWithText';

interface LabelRouteState {
  slug: string | undefined;
  tagType: string | undefined;
  tagName: string | undefined;
  isCategoryBrowse: boolean;
}

const TOKEN_LABEL_STUB = {
  ...TOKEN_INFO_ERC_20,
  metadata: {
    tags: [
      {
        tagType: 'meme' as const,
        name: 'Meme',
        slug: 'meme',
        ordinal: 0,
        meta: null,
      },
    ],
  },
};

const AccountsLabelAddressSearch = ({ slug, tagType, tagName, isCategoryBrowse }: LabelRouteState) => {
  const { isError, isPlaceholderData, data, pagination } = useQueryWithPages({
    resourceName: 'general:addresses_metadata_search',
    filters: {
      slug: isCategoryBrowse ? undefined : slug,
      tag_type: tagType,
    },
    options: {
      placeholderData: generateListStub<'general:addresses_metadata_search'>(
        TOP_ADDRESS,
        50,
        {
          next_page_params: null,
        },
      ),
    },
  });

  const hashesForMetadata = React.useMemo(
    () => (data?.items ?? []).map((item) => item.hash),
    [ data?.items ],
  );
  const { getMetadata } = useAddressesMetadata(hashesForMetadata);

  const enrichedItems = React.useMemo(() => {
    if (!data?.items) return undefined;
    return data.items.map((item) => {
      const metadata = getMetadata(item.hash);
      if (!metadata?.tags.length) return item;

      const existingTags = item.metadata?.tags ?? [];
      const existingSlugs = new Set(existingTags.map((tag) => tag.slug));
      const tags = [
        ...existingTags,
        ...metadata.tags.filter((tag) => !existingSlugs.has(tag.slug)),
      ];

      return {
        ...item,
        metadata: {
          reputation: item.metadata?.reputation ?? metadata.reputation ?? null,
          tags,
        },
      };
    });
  }, [ data?.items, getMetadata ]);

  const content = enrichedItems ? (
    <>
      <Box hideBelow="lg">
        <AddressesLabelSearchTable
          top={ pagination.isVisible ? ACTION_BAR_HEIGHT_DESKTOP : 0 }
          items={ enrichedItems }
          isLoading={ isPlaceholderData }
        />
      </Box>
      <Box hideFrom="lg">
        { enrichedItems.map((item, index) => {
          return (
            <AddressesLabelSearchListItem
              key={ item.hash + (isPlaceholderData ? index : '') }
              item={ item }
              isLoading={ isPlaceholderData }
            />
          );
        }) }
      </Box>
    </>
  ) : null;

  const text = (() => {
    if (isError) {
      return null;
    }

    const num = data?.items.length || 0;
    const labelTagFromResults = enrichedItems
      ?.flatMap((item) => withFallbackLabelIcons(item.metadata?.tags ?? []))
      .find((tag) =>
        tag.tagType === tagType &&
        (isCategoryBrowse || tag.slug === slug || tag.name === tagName) &&
        tag.meta?.tagIcon,
      );

    const tagData: TEntityTag = {
      tagType: tagType as EntityTagType,
      slug,
      // tagName is already the human display string (the category
      // label "Liquidity Pool" in category-browse mode, or the
      // submitted tag name in specific-tag mode). Force renderMode
      // 'name' below so EntityTag uses this verbatim rather than
      // replacing it with the category label of the synthetic
      // tagType — without the override the badge would always read
      // "Liquidity Pool" even when the user navigated to a specific
      // exchange tag.
      name: tagName || slug,
      ordinal: 0,
      meta: labelTagFromResults?.meta,
    };

    return (
      <Flex alignItems="center" columnGap={ 2 } flexWrap="wrap" rowGap={ 1 }>
        <Skeleton loading={ isPlaceholderData } display="inline-block">
          Found{ ' ' }
          <chakra.span fontWeight={ 700 }>
            { num }{ data?.next_page_params || pagination.page > 1 ? '+' : '' }
          </chakra.span>{ ' ' }
          matching result{ num > 1 ? 's' : '' } for
        </Skeleton>
        <EntityTag data={ tagData } isLoading={ isPlaceholderData } noLink renderMode="name"/>
      </Flex>
    );
  })();

  const actionBar = <StickyPaginationWithText text={ text } pagination={ pagination }/>;

  return (
    <>
      <PageTitle title="Search result" withTextAd/>
      <DataListDisplay
        isError={ isError }
        itemsNum={ data?.items.length }
        emptyText={ text }
        actionBar={ actionBar }
      >
        { content }
      </DataListDisplay>
    </>
  );
};

const AccountsLabelTokenSearch = ({ slug, tagType, tagName, isCategoryBrowse }: LabelRouteState) => {
  const router = useRouter();

  const { isError, isPlaceholderData, data, pagination } = useQueryWithPages({
    resourceName: 'general:tokens_metadata_search',
    filters: {
      slug: isCategoryBrowse ? undefined : slug,
      tag_type: tagType,
    },
    options: {
      enabled: Boolean(tagType),
      placeholderData: generateListStub<'general:tokens_metadata_search'>(
        TOKEN_LABEL_STUB,
        50,
        {
          next_page_params: null,
        },
      ),
    },
  });

  const content = data?.items ? (
    <>
      <Box hideBelow="lg">
        <TokenLabelSearchTable
          top={ pagination.isVisible ? ACTION_BAR_HEIGHT_DESKTOP : 0 }
          items={ data.items }
          isLoading={ isPlaceholderData }
        />
      </Box>
      <Box hideFrom="lg">
        { data.items.map((item, index) => (
          <TokenLabelSearchListItem
            key={ item.address_hash + (isPlaceholderData ? index : '') }
            item={ item }
            isLoading={ isPlaceholderData }
          />
        )) }
      </Box>
    </>
  ) : null;

  const label = tagName || slug || 'Meme';
  const labelTag: TEntityTag = {
    tagType: (tagType || 'meme') as EntityTagType,
    slug: slug || 'meme',
    name: label,
    ordinal: 0,
  };

  const text = (() => {
    if (isError) {
      return null;
    }

    const num = data?.items.length || 0;

    return (
      <Flex alignItems="center" columnGap={ 2 } flexWrap="wrap" rowGap={ 1 }>
        <Skeleton loading={ isPlaceholderData } display="inline-block">
          Found{ ' ' }
          <chakra.span fontWeight={ 700 }>
            { num }{ data?.next_page_params || pagination.page > 1 ? '+' : '' }
          </chakra.span>{ ' ' }
          matching token{ num > 1 ? 's' : '' } for
        </Skeleton>
        <EntityTag data={ labelTag } isLoading={ isPlaceholderData } noLink renderMode="name"/>
      </Flex>
    );
  })();

  const titleDetails = (
    <Flex flexDir="column" rowGap={ 2 } color="text.secondary" textStyle="sm" maxW="760px">
      <Flex alignItems="center" columnGap={ 2 } flexWrap="wrap" rowGap={ 1 }>
        <chakra.span color="text.primary" fontWeight={ 700 }>{ label.toUpperCase() }</chakra.span>
        <chakra.span>Related labels:</chakra.span>
        <Link
          href={{ pathname: router.pathname, query: { ...router.query, view: 'accounts' } }}
          variant="underlaid"
        >
          Accounts
        </Link>
      </Flex>
      <chakra.p>
        Tracks key token metrics for VinuChain contracts tagged as { label }. Only indexed tokens with updated token metadata are listed.
      </chakra.p>
      <chakra.p textStyle="xs">
        Label source attribution is required if this data is reused externally.
      </chakra.p>
    </Flex>
  );

  const actionBar = <StickyPaginationWithText text={ text } pagination={ pagination }/>;

  return (
    <>
      <PageTitle title="Token Tracker" secondRow={ titleDetails } withTextAd/>
      <DataListDisplay
        isError={ isError }
        itemsNum={ data?.items.length }
        emptyText={ text }
        actionBar={ actionBar }
      >
        { content }
      </DataListDisplay>
    </>
  );
};

const AccountsLabelSearch = () => {
  const router = useRouter();
  const slug = getQueryParamString(router.query.slug);
  const tagType = getQueryParamString(router.query.tagType);
  const tagName = getQueryParamString(router.query.tagName);
  const view = getQueryParamString(router.query.view);

  // Sentinel slug means "browse every address of this category" — the
  // backend's category-only branch keys off tag_type alone, so drop
  // slug from the filter when we're in category-browse mode.
  const isCategoryBrowse = slug === CATEGORY_BROWSE_SLUG;
  const routeState = { slug, tagType, tagName, isCategoryBrowse };

  if (tagType === 'meme' && view !== 'accounts') {
    return <AccountsLabelTokenSearch { ...routeState }/>;
  }

  return <AccountsLabelAddressSearch { ...routeState }/>;
};

export default AccountsLabelSearch;
