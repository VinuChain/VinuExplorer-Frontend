import React from 'react';

import type { TokenLabelSearchItem } from 'types/api/token';

import {
  TableBody,
  TableColumnHeader,
  type TableColumnHeaderProps,
  TableColumnHeaderSortable,
  TableHeaderSticky,
  TableRoot,
  TableRow,
} from 'toolkit/chakra/table';

import TokenLabelSearchTableItem from './TokenLabelSearchTableItem';

export type TokenLabelSearchSortField = 'rank' | 'address' | 'name' | 'label' | 'price' | 'market_cap' | 'holders' | 'website';
export type TokenLabelSearchRow = {
  item: TokenLabelSearchItem;
  rank: number;
};

interface Props {
  items: Array<TokenLabelSearchRow>;
  top: number;
  sortValue?: string;
  onSortToggle?: (field: TokenLabelSearchSortField) => void;
  isLoading?: boolean;
}

type HeaderCellProps = TableColumnHeaderProps & {
  sortField: TokenLabelSearchSortField;
  sortValue?: string;
  onSortToggle?: (field: TokenLabelSearchSortField) => void;
};

// Without a sort handler the header is plain: the client-side sort only ranks the
// fetched page, so it is offered only when that page is the whole result set.
const HeaderCell = ({ sortField, sortValue, onSortToggle, ...rest }: HeaderCellProps) => {
  if (!sortValue || !onSortToggle) {
    return <TableColumnHeader { ...rest }/>;
  }

  return <TableColumnHeaderSortable sortField={ sortField } sortValue={ sortValue } onSortToggle={ onSortToggle } { ...rest }/>;
};

const TokenLabelSearchTable = ({ items, top, sortValue, onSortToggle, isLoading }: Props) => {
  return (
    <TableRoot w="100%" maxW="100%" minW="1200px" tableLayout="fixed">
      <TableHeaderSticky top={ top }>
        <TableRow>
          <HeaderCell width="56px" py={ 3 } sortField="rank" sortValue={ sortValue } onSortToggle={ onSortToggle }>
            #
          </HeaderCell>
          <HeaderCell width="25%" py={ 3 } sortField="address" sortValue={ sortValue } onSortToggle={ onSortToggle }>
            Contract Address
          </HeaderCell>
          <HeaderCell width="19%" py={ 3 } sortField="name" sortValue={ sortValue } onSortToggle={ onSortToggle }>
            Token Name
          </HeaderCell>
          <HeaderCell width="10%" py={ 3 } sortField="label" sortValue={ sortValue } onSortToggle={ onSortToggle }>
            Label
          </HeaderCell>
          <HeaderCell width="13%" py={ 3 } sortField="price" sortValue={ sortValue } onSortToggle={ onSortToggle } isNumeric>
            Price
          </HeaderCell>
          <HeaderCell width="13%" py={ 3 } sortField="market_cap" sortValue={ sortValue } onSortToggle={ onSortToggle } isNumeric>
            Market Cap
          </HeaderCell>
          <HeaderCell width="7%" py={ 3 } sortField="holders" sortValue={ sortValue } onSortToggle={ onSortToggle } isNumeric>
            Holders
          </HeaderCell>
          <HeaderCell width="10%" py={ 3 } sortField="website" sortValue={ sortValue } onSortToggle={ onSortToggle }>
            Website
          </HeaderCell>
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
