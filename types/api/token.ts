import type { TokenInfoApplication } from './account';
import type { AddressMetadataTagApi } from './addressMetadata';
import type { AddressParam } from './addressParams';

export type NFTTokenType = 'ERC-721' | 'ERC-1155' | 'ERC-404';
export type TokenType = 'ERC-20' | NFTTokenType;

export type TokenReputation = 'ok' | 'scam';

export interface TokenInfo<T extends TokenType = TokenType> {
  address_hash: string;
  type: T;
  symbol: string | null;
  name: string | null;
  decimals: string | null;
  holders_count: string | null;
  exchange_rate: string | null;
  total_supply: string | null;
  icon_url: string | null;
  is_verified_via_admin_panel?: boolean | null;
  is_in_registry?: boolean | null;
  circulating_market_cap: string | null;
  reputation: TokenReputation | null;
  socials?: TokenSocials | null;
  // bridged token fields
  is_bridged?: boolean | null;
  bridge_type?: string | null;
  origin_chain_id?: string | null;
  foreign_address?: string | null;
  filecoin_robust_address?: string | null;
}

export type TokenLabelSearchItem = TokenInfo & {
  metadata?: {
    tags: Array<AddressMetadataTagApi>;
  } | null;
};

export interface TokenLabelSearchResult {
  items: Array<TokenLabelSearchItem>;
  next_page_params: { page_token: string } | null;
}

export interface TokenLabelSearchFilters {
  slug?: string;
  tag_type: string;
}

export interface TokenCounters {
  token_holders_count: string;
  transfers_count: string;
}

export interface TokenHolders {
  items: Array<TokenHolder>;
  next_page_params: TokenHoldersPagination | null;
}

export type TokenHolder = TokenHolderERC20ERC721 | TokenHolderERC1155;

export type TokenHolderBase = {
  address: AddressParam;
  value: string;
};

export type TokenHolderERC20ERC721 = TokenHolderBase;

export type TokenHolderERC1155 = TokenHolderBase & {
  token_id: string;
};

export type TokenHoldersPagination = {
  items_count: number;
  value: string;
};

export interface TokenHoldersDistributionBucket {
  label: string;
  min_usd: number;
  max_usd: number | null;
  holder_count: number;
  sum_usd: string;
}

export interface TokenHoldersDistribution {
  total_holders: number;
  total_value: string | null;
  top5_percentage: number | null;
  top10_percentage: number | null;
  top100_percentage: number | null;
  whale_holders_count: number;
  gini_coefficient: number | null;
  value_buckets: Array<TokenHoldersDistributionBucket>;
}

export interface TokenHoldersChartPoint {
  day: string;
  holder_count: number;
}

export interface TokenHoldersChart {
  items: Array<TokenHoldersChartPoint>;
}

export type ThumbnailSize = '60x60' | '250x250' | '500x500' | 'original';

export interface TokenInstance {
  is_unique: boolean;
  id: string;
  holder_address_hash: string | null;
  image_url: string | null;
  animation_url: string | null;
  media_url?: string | null;
  media_type?: string | null;
  external_app_url: string | null;
  metadata: Record<string, unknown> | null;
  owner: AddressParam | null;
  thumbnails: ({ original: string } & Partial<Record<Exclude<ThumbnailSize, 'original'>, string>>) | null;
}

export interface TokenInstanceMetadataSocketMessage {
  token_id: number;
  fetched_metadata: TokenInstance['metadata'];
}

export interface TokenInstanceTransfersCount {
  transfers_count: number;
}

export interface TokenInventoryResponse {
  items: Array<TokenInstance>;
  next_page_params: TokenInventoryPagination | null;
}

export type TokenInventoryPagination = {
  unique_token: number;
};

export interface TokenSocials {
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  github?: string;
  medium?: string;
  linkedin?: string;
  facebook?: string;
  reddit?: string;
  youtube?: string;
  instagram?: string;
  coinmarketcap?: string;
  coingecko?: string;
}

export type TokenVerifiedInfo = Omit<TokenInfoApplication, 'id' | 'status'>;

export type TokenInventoryFilters = {
  holder_address_hash?: string;
};

export type TokenHoldersSortField = 'value';
export type TokenHoldersSortOrder = 'asc' | 'desc';

export type TokenHoldersFilters = {
  sort?: TokenHoldersSortField;
  order?: TokenHoldersSortOrder;
};
