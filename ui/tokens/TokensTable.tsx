import React from 'react';

import type { TokensClientSortingField, TokensSortingValue } from 'types/api/tokens';

import { TableBody, TableColumnHeader, TableColumnHeaderSortable, TableHeaderSticky, TableRoot, TableRow } from 'toolkit/chakra/table';
import { ACTION_BAR_HEIGHT_DESKTOP } from 'ui/shared/ActionBar';
import { default as getNextSortValueShared } from 'ui/shared/sort/getNextSortValue';

import type { TokenWithMetadata } from './tokenLabelUtils';
import TokensTableItem from './TokensTableItem';

const SORT_SEQUENCE: Record<TokensClientSortingField, Array<TokensSortingValue>> = {
  name: [ 'name-asc', 'name-desc', 'default' ],
  label: [ 'label-asc', 'label-desc', 'default' ],
  fiat_value: [ 'fiat_value-desc', 'fiat_value-asc', 'default' ],
  holder_count: [ 'holder_count-desc', 'holder_count-asc', 'default' ],
  circulating_market_cap: [ 'circulating_market_cap-desc', 'circulating_market_cap-asc', 'default' ],
};

const getNextSortValue = (getNextSortValueShared<TokensClientSortingField, TokensSortingValue>).bind(undefined, SORT_SEQUENCE);

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

  const sort = React.useCallback((field: TokensClientSortingField) => {
    if (!hasSorting) {
      return;
    }
    const value = getNextSortValue(field)(sorting);
    setSorting(value);
  }, [ sorting, setSorting, hasSorting ]);

  return (
    <TableRoot minW="1120px" w="100%" tableLayout="fixed">
      <TableHeaderSticky top={ top ?? ACTION_BAR_HEIGHT_DESKTOP }>
        <TableRow>
          { hasSorting ? (
            <TableColumnHeaderSortable
              w="42%"
              py={ 3 }
              sortField="name"
              sortValue={ sorting }
              onSortToggle={ sort }
              indicatorPosition="right"
            >
              Token
            </TableColumnHeaderSortable>
          ) : (
            <TableColumnHeader w="42%" py={ 3 }>Token</TableColumnHeader>
          ) }
          { /* no backend sort for labels; a client sort would only reorder the current page */ }
          <TableColumnHeader w="12%" py={ 3 }>Label</TableColumnHeader>
          { hasSorting ? (
            <TableColumnHeaderSortable
              isNumeric
              w="16%"
              py={ 3 }
              sortField="fiat_value"
              sortValue={ sorting }
              onSortToggle={ sort }
            >
              Price
            </TableColumnHeaderSortable>
          ) : (
            <TableColumnHeader isNumeric width="16%" py={ 3 }>
              Price
            </TableColumnHeader>
          ) }
          { hasSorting ? (
            <TableColumnHeaderSortable
              isNumeric
              w="18%"
              py={ 3 }
              sortField="circulating_market_cap"
              sortValue={ sorting }
              onSortToggle={ sort }
            >
              Market cap
            </TableColumnHeaderSortable>
          ) : (
            <TableColumnHeader isNumeric width="18%" py={ 3 }>
              Market cap
            </TableColumnHeader>
          ) }
          { hasSorting ? (
            <TableColumnHeaderSortable
              isNumeric
              w="12%"
              py={ 3 }
              sortField="holder_count"
              sortValue={ sorting }
              onSortToggle={ sort }
            >
              Holders
            </TableColumnHeaderSortable>
          ) : (
            <TableColumnHeader isNumeric width="12%" py={ 3 }>
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
