import { Box, chakra, Flex } from '@chakra-ui/react';
import BigNumber from 'bignumber.js';
import { useRouter } from 'next/router';
import React from 'react';

import type { AddressMetadataTagType } from 'types/api/addressMetadata';
import type { EntityTag as TEntityTag, EntityTagType } from 'ui/shared/EntityTags/types';

import config from 'configs/app';
import useAddressesMetadata from 'lib/address/useAddressesMetadata';
import getQueryParamString from 'lib/router/getQueryParamString';
import { TOP_ADDRESS } from 'stubs/address';
import { TOKEN_INFO_ERC_20 } from 'stubs/token';
import { generateListStub } from 'stubs/utils';
import { Link } from 'toolkit/chakra/link';
import { Skeleton } from 'toolkit/chakra/skeleton';
import AddressesLabelSearchListItem from 'ui/addressesLabelSearch/AddressesLabelSearchListItem';
import AddressesLabelSearchTable, { type AddressesLabelSearchRow, type AddressesLabelSearchSortField } from 'ui/addressesLabelSearch/AddressesLabelSearchTable';
import TokenLabelSearchListItem from 'ui/addressesLabelSearch/TokenLabelSearchListItem';
import TokenLabelSearchTable, { type TokenLabelSearchRow, type TokenLabelSearchSortField } from 'ui/addressesLabelSearch/TokenLabelSearchTable';
import { getTokenLabelTags } from 'ui/addressesLabelSearch/tokenLabelUtils';
import { ACTION_BAR_HEIGHT_DESKTOP } from 'ui/shared/ActionBar';
import DataListDisplay from 'ui/shared/DataListDisplay';
import EntityTag from 'ui/shared/EntityTags/EntityTag';
import { CATEGORY_BROWSE_SLUG, getCategoryLabel, withFallbackLabelIcons } from 'ui/shared/EntityTags/utils';
import PageTitle from 'ui/shared/Page/PageTitle';
import useQueryWithPages from 'ui/shared/pagination/useQueryWithPages';
import StickyPaginationWithText from 'ui/shared/StickyPaginationWithText';

interface LabelRouteState {
  slug: string;
  tagType: string;
  tagName: string;
  isCategoryBrowse: boolean;
}

const TOKEN_TRACKER_TAG_TYPES = new Set([ 'meme', 'stablecoin', 'layer_1', 'layer_2' ]);
const LABEL_RESULTS_PAGE_SIZE = 50;
type LabelSearchSortDirection = 'asc' | 'desc';
type LabelSearchSortValue = string | number | BigNumber | null | undefined;

function compareLabelSearchValues(aValue: LabelSearchSortValue, bValue: LabelSearchSortValue) {
  if (aValue === bValue) {
    return 0;
  }

  if (aValue === null || aValue === undefined || aValue === '') {
    return 1;
  }

  if (bValue === null || bValue === undefined || bValue === '') {
    return -1;
  }

  if (BigNumber.isBigNumber(aValue) && BigNumber.isBigNumber(bValue)) {
    return aValue.comparedTo(bValue);
  }

  if (typeof aValue === 'number' && typeof bValue === 'number') {
    return aValue - bValue;
  }

  return String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' });
}

function getAddressLabelSearchValue(row: AddressesLabelSearchRow, field: AddressesLabelSearchSortField): LabelSearchSortValue {
  switch (field) {
    case 'rank':
      return row.rank;
    case 'address':
      return row.item.hash;
    case 'label':
      return row.item.metadata?.tags?.map((tag) => tag.name || tag.slug).join(' ') || '';
    case 'balance':
      return row.item.coin_balance ? BigNumber(row.item.coin_balance) : null;
    case 'txns':
      return row.item.transactions_count ? BigNumber(row.item.transactions_count) : null;
  }
}

function compareAddressLabelRows(a: AddressesLabelSearchRow, b: AddressesLabelSearchRow, field: AddressesLabelSearchSortField) {
  const result = compareLabelSearchValues(getAddressLabelSearchValue(a, field), getAddressLabelSearchValue(b, field));
  return result === 0 ? a.rank - b.rank : result;
}

function getTokenLabelSearchValue(row: TokenLabelSearchRow, field: TokenLabelSearchSortField): LabelSearchSortValue {
  switch (field) {
    case 'rank':
      return row.rank;
    case 'address':
      return row.item.address_hash;
    case 'name':
      return `${ row.item.name || '' } ${ row.item.symbol || '' }`;
    case 'label':
      return getTokenLabelTags(row.item).map((tag) => tag.name || tag.slug).join(' ');
    case 'price':
      return row.item.exchange_rate ? BigNumber(row.item.exchange_rate) : null;
    case 'market_cap':
      return row.item.circulating_market_cap ? BigNumber(row.item.circulating_market_cap) : null;
    case 'holders':
      return row.item.holders_count ? BigNumber(row.item.holders_count) : null;
    case 'website':
      return row.item.socials?.website || '';
  }
}

function compareTokenLabelRows(a: TokenLabelSearchRow, b: TokenLabelSearchRow, field: TokenLabelSearchSortField) {
  const result = compareLabelSearchValues(getTokenLabelSearchValue(a, field), getTokenLabelSearchValue(b, field));
  return result === 0 ? a.rank - b.rank : result;
}

// Pick a user-facing display string for the label-search header that
// never leaks the `_category` browse sentinel. Precedence:
//   1. explicit ?tagName=… query param (set by EntityTag links)
//   2. curated category label for the tag_type (so direct nav like
//      /accounts/label/_category?tagType=meme reads "Meme", not "_category")
//   3. raw slug, unless it's the sentinel, in which case fall back to
//      a titlecased tag_type or empty string
function resolveDisplayName({
  isCategoryBrowse,
  tagName,
  slug,
  tagType,
}: {
  isCategoryBrowse: boolean;
  tagName: string;
  slug: string;
  tagType: string;
}): string {
  if (tagName) {
    return tagName;
  }

  const category = tagType ? getCategoryLabel(tagType as EntityTagType) : undefined;
  if (category) {
    return category;
  }

  if (isCategoryBrowse || slug === CATEGORY_BROWSE_SLUG) {
    return tagType ? tagType.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
  }

  return slug;
}

function getTokenLabelStub(tagType: string, tagName: string, slug: string) {
  const label = tagName || slug || 'Meme';

  return {
    ...TOKEN_INFO_ERC_20,
    metadata: {
      tags: [
        {
          tagType: (tagType || 'meme') as AddressMetadataTagType,
          name: label,
          slug: slug || tagType || 'meme',
          ordinal: 0,
          meta: null,
        },
      ],
    },
  };
}

const AccountsLabelAddressSearch = ({ slug, tagType, tagName, isCategoryBrowse }: LabelRouteState) => {
  const [ sort, setSort ] = React.useState<{ field: AddressesLabelSearchSortField; direction: LabelSearchSortDirection }>({
    field: 'rank',
    direction: 'asc',
  });
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
  const pageStartIndex = (pagination.page - 1) * LABEL_RESULTS_PAGE_SIZE;
  const addressRows = React.useMemo(() => {
    return enrichedItems?.map((item, index) => ({ item, rank: pageStartIndex + index + 1 }));
  }, [ enrichedItems, pageStartIndex ]);
  // The sort below re-orders only the rows already fetched, so it is offered
  // only when this page IS the whole result set. On a paginated result it would
  // present a page-local reordering as a sort of everything.
  const isClientSortable = !isPlaceholderData && pagination.page === 1 && !data?.next_page_params;
  const sortedAddressRows = React.useMemo(() => {
    if (!addressRows) return undefined;
    if (!isClientSortable) return addressRows;

    return [ ...addressRows ].sort((a, b) => {
      const result = compareAddressLabelRows(a, b, sort.field);
      return sort.direction === 'asc' ? result : -result;
    });
  }, [ addressRows, isClientSortable, sort.direction, sort.field ]);
  const sortValue = isClientSortable ? `${ sort.field }_${ sort.direction }` : undefined;
  const handleSortToggle = React.useCallback((field: AddressesLabelSearchSortField) => {
    setSort((current) => ({
      field,
      direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const content = sortedAddressRows ? (
    <>
      <Box hideBelow="lg">
        <AddressesLabelSearchTable
          top={ pagination.isVisible ? ACTION_BAR_HEIGHT_DESKTOP : 0 }
          items={ sortedAddressRows }
          sortValue={ sortValue }
          onSortToggle={ isClientSortable ? handleSortToggle : undefined }
          isLoading={ isPlaceholderData }
        />
      </Box>
      <Box hideFrom="lg">
        { sortedAddressRows.map(({ item, rank }, index) => {
          return (
            <AddressesLabelSearchListItem
              key={ item.hash + (isPlaceholderData ? index : '') }
              item={ item }
              index={ rank }
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
      name: resolveDisplayName({ isCategoryBrowse, tagName, slug, tagType }),
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
  const [ sort, setSort ] = React.useState<{ field: TokenLabelSearchSortField; direction: LabelSearchSortDirection }>({
    field: 'rank',
    direction: 'asc',
  });
  const tokenLabelStub = React.useMemo(
    () => getTokenLabelStub(tagType, tagName, slug),
    [ slug, tagName, tagType ],
  );
  const accountsHref = React.useMemo(() => {
    const query = new URLSearchParams();

    Object.entries(router.query).forEach(([ key, value ]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => query.append(key, item));
      } else if (value) {
        query.set(key, value);
      }
    });
    query.set('view', 'accounts');

    return `?${ query.toString() }`;
  }, [ router.query ]);

  const { isError, isPlaceholderData, data, pagination } = useQueryWithPages({
    resourceName: 'general:tokens_metadata_search',
    filters: {
      slug: isCategoryBrowse ? undefined : slug,
      tag_type: tagType,
    },
    options: {
      enabled: Boolean(tagType),
      placeholderData: generateListStub<'general:tokens_metadata_search'>(
        tokenLabelStub,
        50,
        {
          next_page_params: null,
        },
      ),
    },
  });
  const pageStartIndex = (pagination.page - 1) * LABEL_RESULTS_PAGE_SIZE;
  const tokenRows = React.useMemo(() => {
    return data?.items.map((item, index) => ({ item, rank: pageStartIndex + index + 1 }));
  }, [ data?.items, pageStartIndex ]);
  // Same page-local caveat as the address table above.
  const isClientSortable = !isPlaceholderData && pagination.page === 1 && !data?.next_page_params;
  const sortedTokenRows = React.useMemo(() => {
    if (!tokenRows) return undefined;
    if (!isClientSortable) return tokenRows;

    return [ ...tokenRows ].sort((a, b) => {
      const result = compareTokenLabelRows(a, b, sort.field);
      return sort.direction === 'asc' ? result : -result;
    });
  }, [ isClientSortable, sort.direction, sort.field, tokenRows ]);
  const sortValue = isClientSortable ? `${ sort.field }_${ sort.direction }` : undefined;
  const handleSortToggle = React.useCallback((field: TokenLabelSearchSortField) => {
    setSort((current) => ({
      field,
      direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const content = sortedTokenRows ? (
    <>
      <Box hideBelow="lg" overflowX="auto" maxW="100%">
        <TokenLabelSearchTable
          top={ pagination.isVisible ? ACTION_BAR_HEIGHT_DESKTOP : 0 }
          items={ sortedTokenRows }
          sortValue={ sortValue }
          onSortToggle={ isClientSortable ? handleSortToggle : undefined }
          isLoading={ isPlaceholderData }
        />
      </Box>
      <Box hideFrom="lg">
        { sortedTokenRows.map(({ item, rank }, index) => (
          <TokenLabelSearchListItem
            key={ item.address_hash + (isPlaceholderData ? index : '') }
            item={ item }
            index={ rank }
            isLoading={ isPlaceholderData }
          />
        )) }
      </Box>
    </>
  ) : null;

  const label = resolveDisplayName({ isCategoryBrowse, tagName, slug, tagType }) || 'Meme';
  const labelTagFromResults = data?.items
    .flatMap((item) => getTokenLabelTags(item))
    .find((tag) =>
      tag.tagType === tagType &&
      (isCategoryBrowse || tag.slug === slug || tag.name === tagName) &&
      tag.meta,
    );
  const labelTag: TEntityTag = {
    tagType: (tagType || 'meme') as EntityTagType,
    slug: slug || 'meme',
    name: label,
    ordinal: 0,
    meta: labelTagFromResults?.meta,
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
          href={ accountsHref }
          variant="underlaid"
        >
          Accounts
        </Link>
      </Flex>
      <chakra.p>
        Tracks key token metrics for { config.chain.name } contracts tagged as { label }. Only indexed tokens with updated token metadata are listed.
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

  if (TOKEN_TRACKER_TAG_TYPES.has(tagType) && view !== 'accounts') {
    return <AccountsLabelTokenSearch { ...routeState }/>;
  }

  return <AccountsLabelAddressSearch { ...routeState }/>;
};

export default AccountsLabelSearch;
