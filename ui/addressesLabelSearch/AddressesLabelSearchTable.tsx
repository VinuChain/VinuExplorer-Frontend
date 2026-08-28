import React from 'react';

import type { AddressesItem } from 'types/api/addresses';

import { currencyUnits } from 'lib/units';
import {
  TableBody,
  TableColumnHeader,
  type TableColumnHeaderProps,
  TableColumnHeaderSortable,
  TableHeaderSticky,
  TableRoot,
  TableRow,
} from 'toolkit/chakra/table';

import AddressesLabelSearchTableItem from './AddressesLabelSearchTableItem';

export type AddressesLabelSearchSortField = 'rank' | 'address' | 'label' | 'balance' | 'txns';
export type AddressesLabelSearchRow = {
  item: AddressesItem;
  rank: number;
};

interface Props {
  items: Array<AddressesLabelSearchRow>;
  top: number;
  sortValue?: string;
  onSortToggle?: (field: AddressesLabelSearchSortField) => void;
  isLoading?: boolean;
}

type HeaderCellProps = TableColumnHeaderProps & {
  sortField: AddressesLabelSearchSortField;
  sortValue?: string;
  onSortToggle?: (field: AddressesLabelSearchSortField) => void;
};

// Without a sort handler the header is plain: the client-side sort only ranks the
// fetched page, so it is offered only when that page is the whole result set.
const HeaderCell = ({ sortField, sortValue, onSortToggle, ...rest }: HeaderCellProps) => {
  if (!sortValue || !onSortToggle) {
    return <TableColumnHeader { ...rest }/>;
  }

  return <TableColumnHeaderSortable sortField={ sortField } sortValue={ sortValue } onSortToggle={ onSortToggle } { ...rest }/>;
};

const AddressesLabelSearchTable = ({ items, top, sortValue, onSortToggle, isLoading }: Props) => {
  return (
    <TableRoot maxW="1040px" tableLayout="fixed">
      <TableHeaderSticky top={ top }>
        <TableRow>
          <HeaderCell
            width="56px"
            py={ 3 }
            sortField="rank"
            sortValue={ sortValue }
            onSortToggle={ onSortToggle }
          >
            #
          </HeaderCell>
          <HeaderCell
            width="38%"
            py={ 3 }
            sortField="address"
            sortValue={ sortValue }
            onSortToggle={ onSortToggle }
          >
            Address
          </HeaderCell>
          <HeaderCell
            width="26%"
            py={ 3 }
            sortField="label"
            sortValue={ sortValue }
            onSortToggle={ onSortToggle }
          >
            Label
          </HeaderCell>
          <HeaderCell
            width="16%"
            py={ 3 }
            sortField="balance"
            sortValue={ sortValue }
            onSortToggle={ onSortToggle }
            isNumeric
          >
            { `Balance ${ currencyUnits.ether }` }
          </HeaderCell>
          <HeaderCell
            width="14%"
            py={ 3 }
            sortField="txns"
            sortValue={ sortValue }
            onSortToggle={ onSortToggle }
            isNumeric
          >
            Txn count
          </HeaderCell>
        </TableRow>
      </TableHeaderSticky>
      <TableBody>
        { items.map(({ item, rank }, index) => (
          <AddressesLabelSearchTableItem
            key={ item.hash + (isLoading ? index : '') }
            item={ item }
            index={ rank }
            isLoading={ isLoading }
          />
        )) }
      </TableBody>
    </TableRoot>
  );
};

export default AddressesLabelSearchTable;
