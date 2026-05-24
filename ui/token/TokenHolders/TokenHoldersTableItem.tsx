import BigNumber from 'bignumber.js';
import React from 'react';

import type { TokenHolder, TokenInfo } from 'types/api/token';

import { TableCell, TableRow } from 'toolkit/chakra/table';
import { TruncatedText } from 'toolkit/components/truncation/TruncatedText';
import AddressEntity from 'ui/shared/entities/address/AddressEntity';
import EntityTag from 'ui/shared/EntityTags/EntityTag';
import { withFallbackLabelIcons } from 'ui/shared/EntityTags/utils';
import Utilization from 'ui/shared/Utilization/Utilization';
import AssetValue from 'ui/shared/value/AssetValue';

type Props = {
  holder: TokenHolder;
  token: TokenInfo;
  rank: number;
  isLoading?: boolean;
};

const formatUsd = (amount: string, decimals: string | null | undefined, rate: string | null | undefined): string => {
  // Without a rate OR without decimals we can't compute USD honestly — the
  // raw `amount` is in token base-units, so a missing decimals would render
  // a value off by ~1e18 from reality. Better to show '-' than to silently
  // misprice.
  if (!rate || !decimals) return '-';
  const tokens = new BigNumber(amount).div(new BigNumber(10).pow(decimals));
  const usd = tokens.times(rate);
  return '$' + usd.toFormat(2);
};

const TokenHoldersTableItem = ({ holder, token, rank, isLoading }: Props) => {
  // Render every meaningful non-name tag as a Label badge — covers
  // the curated "Category Label" dropdown on /public-tags/submit
  // (meme, exchange, liquidity_pool, defi, protocol) plus legacy
  // Blockscout types (information, classifier, note) without an
  // explicit allow-list. Two tag types are excluded here:
  //   * `name`    — handled by AddressEntity (replaces the hex hash).
  //   * `generic` — too vague to render as a badge per product
  //                 guidance ("General" is the default option in the
  //                 submit dropdown and offers no signal once the Tag
  //                 itself has surfaced via AddressEntity).
  const labelTags = withFallbackLabelIcons(holder.address.metadata?.tags ?? []).filter(t => t.tagType !== 'name' && t.tagType !== 'generic');

  return (
    <TableRow>
      <TableCell verticalAlign="middle" isNumeric color="text_secondary">{ rank }</TableCell>
      <TableCell verticalAlign="middle">
        <AddressEntity address={ holder.address } isLoading={ isLoading } flexGrow={ 1 } fontWeight="700"/>
      </TableCell>
      <TableCell verticalAlign="middle">
        { labelTags.length > 0 ? labelTags.map(tag => (
          <EntityTag key={ tag.name } data={ tag } isLoading={ isLoading } mr={ 1 }/>
        )) : null }
      </TableCell>
      { (token.type === 'ERC-1155' || token.type === 'ERC-404') && 'token_id' in holder && (
        <TableCell verticalAlign="middle">
          <TruncatedText text={ holder.token_id } loading={ isLoading } w="100%"/>
        </TableCell>
      ) }
      <TableCell verticalAlign="middle" isNumeric>
        <AssetValue amount={ holder.value } decimals={ token.decimals ?? '0' } loading={ isLoading }/>
      </TableCell>
      <TableCell verticalAlign="middle" isNumeric>
        { formatUsd(holder.value, token.decimals, token.exchange_rate) }
      </TableCell>
      { token.total_supply && token.type !== 'ERC-404' && (
        <TableCell verticalAlign="middle" isNumeric>
          <Utilization
            value={ BigNumber(holder.value).div(BigNumber(token.total_supply)).dp(4).toNumber() }
            colorScheme="green"
            display="inline-flex"
            isLoading={ isLoading }
          />
        </TableCell>
      ) }
    </TableRow>
  );
};

export default React.memo(TokenHoldersTableItem);
