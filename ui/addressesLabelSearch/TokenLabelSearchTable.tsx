import React from 'react';

import type { TokenLabelSearchItem } from 'types/api/token';

import { TableBody, TableColumnHeader, TableHeaderSticky, TableRoot, TableRow } from 'toolkit/chakra/table';

import TokenLabelSearchTableItem from './TokenLabelSearchTableItem';

interface Props {
  items: Array<TokenLabelSearchItem>;
  top: number;
  isLoading?: boolean;
}

const TokenLabelSearchTable = ({ items, top, isLoading }: Props) => {
  return (
    <TableRoot maxW="1040px">
      <TableHeaderSticky top={ top }>
        <TableRow>
          <TableColumnHeader width="30%" py={ 3 }>Contract Address</TableColumnHeader>
          <TableColumnHeader width="25%" py={ 3 }>Token Name</TableColumnHeader>
          <TableColumnHeader width="13%" py={ 3 }>Label</TableColumnHeader>
          <TableColumnHeader width="14%" py={ 3 } isNumeric>Market Cap</TableColumnHeader>
          <TableColumnHeader width="8%" py={ 3 } isNumeric>Holders</TableColumnHeader>
          <TableColumnHeader width="10%" py={ 3 }>Website</TableColumnHeader>
        </TableRow>
      </TableHeaderSticky>
      <TableBody>
        { items.map((item, index) => (
          <TokenLabelSearchTableItem
            key={ item.address_hash + (isLoading ? index : '') }
            item={ item }
            isLoading={ isLoading }
          />
        )) }
      </TableBody>
    </TableRoot>
  );
};

export default React.memo(TokenLabelSearchTable);
