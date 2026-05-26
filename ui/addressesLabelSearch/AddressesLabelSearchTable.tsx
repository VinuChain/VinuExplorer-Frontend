import React from 'react';

import type { AddressesItem } from 'types/api/addresses';

import { currencyUnits } from 'lib/units';
import { TableBody, TableColumnHeaderSortable, TableHeaderSticky, TableRoot, TableRow } from 'toolkit/chakra/table';

import AddressesLabelSearchTableItem from './AddressesLabelSearchTableItem';

export type AddressesLabelSearchSortField = 'rank' | 'address' | 'label' | 'balance' | 'txns';
export type AddressesLabelSearchRow = {
  item: AddressesItem;
  rank: number;
};

interface Props {
  items: Array<AddressesLabelSearchRow>;
  top: number;
  sortValue: string;
  onSortToggle: (field: AddressesLabelSearchSortField) => void;
  isLoading?: boolean;
}

const AddressesLabelSearchTable = ({ items, top, sortValue, onSortToggle, isLoading }: Props) => {
  return (
    <TableRoot maxW="1040px" tableLayout="fixed">
      <TableHeaderSticky top={ top }>
        <TableRow>
          <TableColumnHeaderSortable
            width="56px"
            py={ 3 }
            sortField="rank"
            sortValue={ sortValue }
            onSortToggle={ onSortToggle }
          >
            #
          </TableColumnHeaderSortable>
          <TableColumnHeaderSortable
            width="38%"
            py={ 3 }
            sortField="address"
            sortValue={ sortValue }
            onSortToggle={ onSortToggle }
          >
            Address
          </TableColumnHeaderSortable>
          <TableColumnHeaderSortable
            width="26%"
            py={ 3 }
            sortField="label"
            sortValue={ sortValue }
            onSortToggle={ onSortToggle }
          >
            Label
          </TableColumnHeaderSortable>
          <TableColumnHeaderSortable
            width="16%"
            py={ 3 }
            sortField="balance"
            sortValue={ sortValue }
            onSortToggle={ onSortToggle }
            isNumeric
          >
            { `Balance ${ currencyUnits.ether }` }
          </TableColumnHeaderSortable>
          <TableColumnHeaderSortable
            width="14%"
            py={ 3 }
            sortField="txns"
            sortValue={ sortValue }
            onSortToggle={ onSortToggle }
            isNumeric
          >
            Txn count
          </TableColumnHeaderSortable>
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
