import React from 'react';

import type { AddressesItem } from 'types/api/addresses';

import { currencyUnits } from 'lib/units';
import { TableBody, TableColumnHeader, TableHeaderSticky, TableRoot, TableRow } from 'toolkit/chakra/table';

import AddressesLabelSearchTableItem from './AddressesLabelSearchTableItem';

interface Props {
  items: Array<AddressesItem>;
  top: number;
  isLoading?: boolean;
}

const AddressesLabelSearchTable = ({ items, top, isLoading }: Props) => {
  return (
    <TableRoot maxW="1040px" tableLayout="fixed">
      <TableHeaderSticky top={ top }>
        <TableRow>
          <TableColumnHeader width="42%" py={ 3 }>Address</TableColumnHeader>
          <TableColumnHeader width="28%" py={ 3 }>Label</TableColumnHeader>
          <TableColumnHeader width="16%" py={ 3 } isNumeric>{ `Balance ${ currencyUnits.ether }` }</TableColumnHeader>
          <TableColumnHeader width="14%" py={ 3 } isNumeric>Txn count</TableColumnHeader>
        </TableRow>
      </TableHeaderSticky>
      <TableBody>
        { items.map((item, index) => (
          <AddressesLabelSearchTableItem
            key={ item.hash + (isLoading ? index : '') }
            item={ item }
            isLoading={ isLoading }
          />
        )) }
      </TableBody>
    </TableRoot>
  );
};

export default AddressesLabelSearchTable;
