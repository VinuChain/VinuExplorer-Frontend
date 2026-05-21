import React from 'react';

import type { TokenHolder, TokenInfo } from 'types/api/token';

import { TableBody, TableColumnHeader, TableHeaderSticky, TableRoot, TableRow } from 'toolkit/chakra/table';
import TokenHoldersTableItem from 'ui/token/TokenHolders/TokenHoldersTableItem';

interface Props {
  data: Array<TokenHolder>;
  token: TokenInfo;
  top: number;
  isLoading?: boolean;
  pageStartIndex?: number;
}

const TokenHoldersTable = ({ data, token, top, isLoading, pageStartIndex = 0 }: Props) => {
  return (
    <TableRoot>
      <TableHeaderSticky top={ top }>
        <TableRow>
          <TableColumnHeader w="60px" isNumeric>Rank</TableColumnHeader>
          <TableColumnHeader w="32%">Holder</TableColumnHeader>
          <TableColumnHeader w="180px">Label</TableColumnHeader>
          { (token.type === 'ERC-1155' || token.type === 'ERC-404') && <TableColumnHeader w="180px">ID#</TableColumnHeader> }
          <TableColumnHeader isNumeric width="220px">Quantity</TableColumnHeader>
          <TableColumnHeader isNumeric width="140px">USD Value</TableColumnHeader>
          { token.total_supply && token.type !== 'ERC-404' && <TableColumnHeader isNumeric width="175px">Percentage</TableColumnHeader> }
        </TableRow>
      </TableHeaderSticky>
      <TableBody>
        { data.map((item, index) => {
          const tokenId = 'token_id' in item ? item.token_id : null;
          return (
            <TokenHoldersTableItem
              key={ item.address.hash + tokenId + (isLoading ? index : '') }
              holder={ item }
              token={ token }
              rank={ pageStartIndex + index + 1 }
              isLoading={ isLoading }
            />
          );
        }) }
      </TableBody>
    </TableRoot>
  );
};

export default React.memo(TokenHoldersTable);
