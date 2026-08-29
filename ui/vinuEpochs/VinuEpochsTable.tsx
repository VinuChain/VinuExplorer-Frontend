import React from 'react';

import type { VinuEpoch } from 'types/api/vinuEpochs';

import { TableBody, TableColumnHeader, TableHeaderSticky, TableRoot, TableRow } from 'toolkit/chakra/table';
import TimeFormatToggle from 'ui/shared/time/TimeFormatToggle';

import VinuEpochsTableItem from './VinuEpochsTableItem';

interface Props {
  items: Array<VinuEpoch>;
  isLoading?: boolean;
  top: number;
}

const VinuEpochsTable = ({ items, isLoading, top }: Props) => {
  return (
    <TableRoot minW="1100px">
      <TableHeaderSticky top={ top }>
        <TableRow>
          <TableColumnHeader w="110px">Epoch</TableColumnHeader>
          <TableColumnHeader w="120px">Duration</TableColumnHeader>
          <TableColumnHeader w="230px">
            End time
            <TimeFormatToggle/>
          </TableColumnHeader>
          <TableColumnHeader w="200px" isNumeric>Total base reward weight</TableColumnHeader>
          <TableColumnHeader w="150px" isNumeric>Base reward / second</TableColumnHeader>
          <TableColumnHeader w="180px" isNumeric>Total stake</TableColumnHeader>
          <TableColumnHeader w="180px" isNumeric>Total supply</TableColumnHeader>
        </TableRow>
      </TableHeaderSticky>
      <TableBody>
        { items.map((item, index) => (
          <VinuEpochsTableItem
            key={ String(item.number) + (isLoading ? String(index) : '') }
            item={ item }
            isLoading={ isLoading }
          />
        )) }
      </TableBody>
    </TableRoot>
  );
};

export default React.memo(VinuEpochsTable);
