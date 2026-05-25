import React from 'react';

import type { TokensSortingField, TokensSortingValue } from 'types/api/tokens';

import { TableBody, TableColumnHeader, TableColumnHeaderSortable, TableHeaderSticky, TableRoot, TableRow } from 'toolkit/chakra/table';
import { ACTION_BAR_HEIGHT_DESKTOP } from 'ui/shared/ActionBar';
import { default as getNextSortValueShared } from 'ui/shared/sort/getNextSortValue';

import type { TokenWithMetadata } from './tokenLabelUtils';
import TokensTableItem from './TokensTableItem';

const SORT_SEQUENCE: Record<TokensSortingField, Array<TokensSortingValue>> = {
  fiat_value: [ 'fiat_value-desc', 'fiat_value-asc', 'default' ],
  holders_count: [ 'holders_count-desc', 'holders_count-asc', 'default' ],
  circulating_market_cap: [ 'circulating_market_cap-desc', 'circulating_market_cap-asc', 'default' ],
};

const getNextSortValue = (getNextSortValueShared<TokensSortingField, TokensSortingValue>).bind(undefined, SORT_SEQUENCE);

type Props = {
  items: Array<TokenWithMetadata>;
  page: number;
  sorting?: TokensSortingValue;
  setSorting?: (value: TokensSortingValue) => void;
  isLoading?: boolean;
  top?: number;
};

const TokensTable = ({ items, page, isLoading, sorting, setSorting, top }: Props) => {

  const hasSorting = setSorting && sorting;

  const sort = React.useCallback((field: TokensSortingField) => {
    if (!hasSorting) {
      return;
    }
    const value = getNextSortValue(field)(sorting);
    setSorting(value);
  }, [ sorting, setSorting, hasSorting ]);

  return (
    <TableRoot>
      <TableHeaderSticky top={ top ?? ACTION_BAR_HEIGHT_DESKTOP }>
        <TableRow>
          <TableColumnHeader w="35%">Token</TableColumnHeader>
          <TableColumnHeader w="15%">Label</TableColumnHeader>
          { hasSorting ? (
            <TableColumnHeaderSortable
              isNumeric
              w="15%"
              sortField="fiat_value"
              sortValue={ sorting }
              onSortToggle={ sort }
            >
              Price
            </TableColumnHeaderSortable>
          ) : (
            <TableColumnHeader isNumeric width="15%">
              Price
            </TableColumnHeader>
          ) }
          { hasSorting ? (
            <TableColumnHeaderSortable
              isNumeric
              w="20%"
              sortField="circulating_market_cap"
              sortValue={ sorting }
              onSortToggle={ sort }
            >
              Market cap
            </TableColumnHeaderSortable>
          ) : (
            <TableColumnHeader isNumeric width="20%">
              Market cap
            </TableColumnHeader>
          ) }
          { hasSorting ? (
            <TableColumnHeaderSortable
              isNumeric
              w="15%"
              sortField="holders_count"
              sortValue={ sorting }
              onSortToggle={ sort }
            >
              Holders
            </TableColumnHeaderSortable>
          ) : (
            <TableColumnHeader isNumeric width="15%">
              Holders
            </TableColumnHeader>
          ) }
        </TableRow>
      </TableHeaderSticky>
      <TableBody>
        { items.map((item, index) => {
          const chainIds = 'chain_infos' in item ? Object.keys(item.chain_infos).join(',') : undefined;

          return (
            <TokensTableItem
              key={ item.address_hash + (isLoading ? index : '') + (chainIds ? chainIds : '') }
              token={ item }
              index={ index }
              page={ page }
              isLoading={ isLoading }
            />
          );
        }) }
      </TableBody>
    </TableRoot>
  );
};

export default TokensTable;
