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
    <TableRoot>
      <TableHeaderSticky top={ top }>
        <TableRow>
          <TableColumnHeader width="30%">Contract Address</TableColumnHeader>
          <TableColumnHeader width="34%">Token Name</TableColumnHeader>
          <TableColumnHeader width="16%" isNumeric>Market Cap</TableColumnHeader>
          <TableColumnHeader width="10%" isNumeric>Holders</TableColumnHeader>
          <TableColumnHeader width="10%">Website</TableColumnHeader>
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
