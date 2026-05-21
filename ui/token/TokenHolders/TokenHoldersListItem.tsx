import BigNumber from 'bignumber.js';
import React from 'react';

import type { TokenHolder, TokenInfo } from 'types/api/token';

import { TruncatedText } from 'toolkit/components/truncation/TruncatedText';
import AddressEntity from 'ui/shared/entities/address/AddressEntity';
import EntityTag from 'ui/shared/EntityTags/EntityTag';
import ListItemMobileGrid from 'ui/shared/ListItemMobile/ListItemMobileGrid';
import Utilization from 'ui/shared/Utilization/Utilization';
import AssetValue from 'ui/shared/value/AssetValue';

interface Props {
  holder: TokenHolder;
  token: TokenInfo;
  rank: number;
  isLoading?: boolean;
}

const TokenHoldersListItem = ({ holder, token, rank, isLoading }: Props) => {
  const labelTags = (holder.address.metadata?.tags ?? []).filter(t => t.tagType === 'protocol' || t.tagType === 'generic');
  // Matches the desktop renderer (TokenHoldersTableItem.formatUsd): without a
  // rate OR without decimals we can't compute USD honestly — the raw `amount`
  // is in token base-units, so a missing decimals would render a value off by
  // ~1e18 from reality. Show '-' instead of silently mispricing.
  const usd = (() => {
    if (!token.exchange_rate || !token.decimals) return '-';
    const v = new BigNumber(holder.value).div(new BigNumber(10).pow(token.decimals)).times(token.exchange_rate);
    return '$' + v.toFormat(2);
  })();

  return (
    <ListItemMobileGrid.Container>
      <ListItemMobileGrid.Label isLoading={ isLoading }>Rank</ListItemMobileGrid.Label>
      <ListItemMobileGrid.Value>{ rank }</ListItemMobileGrid.Value>

      <ListItemMobileGrid.Label isLoading={ isLoading }>Address</ListItemMobileGrid.Label>
      <ListItemMobileGrid.Value>
        <AddressEntity address={ holder.address } isLoading={ isLoading } fontWeight="700" maxW="100%"/>
      </ListItemMobileGrid.Value>

      { labelTags.length > 0 && (
        <>
          <ListItemMobileGrid.Label isLoading={ isLoading }>Label</ListItemMobileGrid.Label>
          <ListItemMobileGrid.Value>
            { labelTags.map(tag => <EntityTag key={ tag.name } data={ tag } isLoading={ isLoading } mr={ 1 }/>) }
          </ListItemMobileGrid.Value>
        </>
      ) }

      { (token.type === 'ERC-1155' || token.type === 'ERC-404') && 'token_id' in holder && (
        <>
          <ListItemMobileGrid.Label isLoading={ isLoading }>ID#</ListItemMobileGrid.Label>
          <ListItemMobileGrid.Value>
            <TruncatedText text={ holder.token_id } loading={ isLoading } w="100%"/>
          </ListItemMobileGrid.Value>
        </>
      ) }

      <ListItemMobileGrid.Label isLoading={ isLoading }>Quantity</ListItemMobileGrid.Label>
      <ListItemMobileGrid.Value>
        <AssetValue amount={ holder.value } decimals={ token.decimals ?? '0' } loading={ isLoading }/>
      </ListItemMobileGrid.Value>

      <ListItemMobileGrid.Label isLoading={ isLoading }>USD Value</ListItemMobileGrid.Label>
      <ListItemMobileGrid.Value>{ usd }</ListItemMobileGrid.Value>

      { token.total_supply && token.type !== 'ERC-404' && (
        <>
          <ListItemMobileGrid.Label isLoading={ isLoading }>Percentage</ListItemMobileGrid.Label>
          <ListItemMobileGrid.Value>
            <Utilization
              value={ BigNumber(holder.value).div(BigNumber(token.total_supply)).dp(4).toNumber() }
              colorScheme="green"
              isLoading={ isLoading }
              display="inline-flex"
            />
          </ListItemMobileGrid.Value>
        </>
      ) }
    </ListItemMobileGrid.Container>
  );
};

export default TokenHoldersListItem;
