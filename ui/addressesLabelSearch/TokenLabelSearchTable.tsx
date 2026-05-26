import React from 'react';

import type { TokenLabelSearchItem } from 'types/api/token';

import { TableBody, TableColumnHeaderSortable, TableHeaderSticky, TableRoot, TableRow } from 'toolkit/chakra/table';

import TokenLabelSearchTableItem from './TokenLabelSearchTableItem';

export type TokenLabelSearchSortField = 'rank' | 'address' | 'name' | 'label' | 'price' | 'market_cap' | 'holders' | 'website';
export type TokenLabelSearchRow = {
  item: TokenLabelSearchItem;
  rank: number;
};

interface Props {
  items: Array<TokenLabelSearchRow>;
  top: number;
  sortValue: string;
  onSortToggle: (field: TokenLabelSearchSortField) => void;
  isLoading?: boolean;
}

const TokenLabelSearchTable = ({ items, top, sortValue, onSortToggle, isLoading }: Props) => {
  return (
    <TableRoot w="100%" maxW="100%" minW="1120px" tableLayout="fixed">
      <TableHeaderSticky top={ top }>
        <TableRow>
          <TableColumnHeaderSortable width="56px" py={ 3 } sortField="rank" sortValue={ sortValue } onSortToggle={ onSortToggle }>
            #
          </TableColumnHeaderSortable>
          <TableColumnHeaderSortable width="26%" py={ 3 } sortField="address" sortValue={ sortValue } onSortToggle={ onSortToggle }>
            Contract Address
          </TableColumnHeaderSortable>
          <TableColumnHeaderSortable width="20%" py={ 3 } sortField="name" sortValue={ sortValue } onSortToggle={ onSortToggle }>
            Token Name
          </TableColumnHeaderSortable>
          <TableColumnHeaderSortable width="11%" py={ 3 } sortField="label" sortValue={ sortValue } onSortToggle={ onSortToggle }>
            Label
          </TableColumnHeaderSortable>
          <TableColumnHeaderSortable width="14%" py={ 3 } sortField="price" sortValue={ sortValue } onSortToggle={ onSortToggle } isNumeric>
            Price
          </TableColumnHeaderSortable>
          <TableColumnHeaderSortable width="14%" py={ 3 } sortField="market_cap" sortValue={ sortValue } onSortToggle={ onSortToggle } isNumeric>
            Market Cap
          </TableColumnHeaderSortable>
          <TableColumnHeaderSortable width="7%" py={ 3 } sortField="holders" sortValue={ sortValue } onSortToggle={ onSortToggle } isNumeric>
            Holders
          </TableColumnHeaderSortable>
          <TableColumnHeaderSortable width="8%" py={ 3 } sortField="website" sortValue={ sortValue } onSortToggle={ onSortToggle }>
            Website
          </TableColumnHeaderSortable>
        </TableRow>
      </TableHeaderSticky>
      <TableBody>
        { items.map(({ item, rank }, index) => (
          <TokenLabelSearchTableItem
            key={ item.address_hash + (isLoading ? index : '') }
            item={ item }
            index={ rank }
            isLoading={ isLoading }
          />
        )) }
      </TableBody>
    </TableRoot>
  );
};

export default React.memo(TokenLabelSearchTable);
