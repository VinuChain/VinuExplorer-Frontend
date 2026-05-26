import { Box } from '@chakra-ui/react';
import React from 'react';

import type { TokensSortingValue } from 'types/api/tokens';

import useAddressesMetadata from 'lib/address/useAddressesMetadata';
import { apos } from 'toolkit/utils/htmlEntities';
import DataFetchAlert from 'ui/shared/DataFetchAlert';
import DataListDisplay from 'ui/shared/DataListDisplay';
import type { QueryWithPagesResult } from 'ui/shared/pagination/useQueryWithPages';

import { getTokenLabelTags, type TokenWithMetadata } from './tokenLabelUtils';
import TokensListItem from './TokensListItem';
import TokensTable from './TokensTable';

interface Props {
  query: QueryWithPagesResult<'general:tokens'> | QueryWithPagesResult<'general:tokens_bridged'> | QueryWithPagesResult<'multichainAggregator:tokens'>;
  onSortChange?: (value: TokensSortingValue) => void;
  sort?: TokensSortingValue;
  actionBar?: React.ReactNode;
  hasActiveFilters: boolean;
  description?: React.ReactNode;
  tableTop?: number;
}

function getTokenLabelSortValue(token: TokenWithMetadata) {
  return getTokenLabelTags(token).map((tag) => tag.name || tag.slug).join(' ').toLocaleLowerCase();
}

function sortTokensByLabel(items: Array<TokenWithMetadata>, sort?: TokensSortingValue) {
  if (sort !== 'label-asc' && sort !== 'label-desc') {
    return items;
  }

  const order = sort === 'label-asc' ? 1 : -1;

  return [ ...items ].sort((a, b) => {
    const labelA = getTokenLabelSortValue(a);
    const labelB = getTokenLabelSortValue(b);

    if (Boolean(labelA) !== Boolean(labelB)) {
      return labelA ? -1 : 1;
    }

    const labelCompare = labelA.localeCompare(labelB);
    if (labelCompare !== 0) {
      return labelCompare * order;
    }

    const nameCompare = (a.name ?? '').localeCompare(b.name ?? '');
    if (nameCompare !== 0) {
      return nameCompare * order;
    }

    return a.address_hash.localeCompare(b.address_hash) * order;
  });
}

const Tokens = ({ query, onSortChange, sort, actionBar, description, hasActiveFilters, tableTop }: Props) => {

  const { isError, isPlaceholderData, data, pagination } = query;
  const hashesForMetadata = React.useMemo(
    () => (data?.items ?? []).map((item) => item.address_hash),
    [ data?.items ],
  );
  const { getMetadata } = useAddressesMetadata(hashesForMetadata);

  const enrichedItems: Array<TokenWithMetadata> | undefined = React.useMemo(() => {
    if (!data?.items) {
      return undefined;
    }

    return data.items.map((item) => {
      const meta = getMetadata(item.address_hash);
      const fetchedTags = meta?.tags ?? [];

      if (!fetchedTags.length) {
        return item;
      }

      const existing = 'metadata' in item ? item.metadata?.tags ?? [] : [];
      const existingSlugs = new Set(existing.map((tag) => tag.slug));
      const mergedTags = [ ...existing, ...fetchedTags.filter((tag) => !existingSlugs.has(tag.slug)) ];

      return {
        ...item,
        metadata: {
          tags: mergedTags,
        },
      };
    });
  }, [ data?.items, getMetadata ]);

  const sortedItems = React.useMemo(() => {
    return enrichedItems ? sortTokensByLabel(enrichedItems, sort) : undefined;
  }, [ enrichedItems, sort ]);

  if (isError) {
    return <DataFetchAlert/>;
  }

  const content = sortedItems ? (
    <>
      <Box hideFrom="lg">
        { description }
        { sortedItems.map((item, index) => {
          const chainIds = 'chain_infos' in item ? Object.keys(item.chain_infos).join(',') : undefined;

          return (
            <TokensListItem
              key={ item.address_hash + (isPlaceholderData ? index : '') + (chainIds ? chainIds : '') }
              token={ item }
              index={ index }
              page={ pagination.page }
              isLoading={ isPlaceholderData }
            />
          );
        }) }
      </Box>
      <Box hideBelow="lg" overflowX="auto" maxW="100%">
        { description }
        <TokensTable
          items={ sortedItems }
          page={ pagination.page }
          isLoading={ isPlaceholderData }
          setSorting={ onSortChange }
          sorting={ sort }
          top={ tableTop }
        />
      </Box>
    </>
  ) : null;

  return (
    <DataListDisplay
      isError={ isError }
      itemsNum={ data?.items.length }
      emptyText="There are no tokens."
      filterProps={{
        emptyFilteredText: `Couldn${ apos }t find token that matches your filter query.`,
        hasActiveFilters,
      }}
      actionBar={ query.pagination.isVisible || hasActiveFilters ? actionBar : null }
    >
      { content }
    </DataListDisplay>
  );
};

export default Tokens;
