import type * as bens from '@blockscout/bens-types';
import type * as tac from '@blockscout/tac-operation-lifecycle-types';
import type { TokenReputation, TokenType } from 'types/api/token';

import type { AddressMetadataTagApi } from './addressMetadata';

export const SEARCH_RESULT_TYPES = {
  token: 'token',
  address: 'address',
  block: 'block',
  transaction: 'transaction',
  contract: 'contract',
  ens_domain: 'ens_domain',
  cluster: 'cluster',
  label: 'label',
  tag: 'tag',
  user_operation: 'user_operation',
  blob: 'blob',
  metadata_tag: 'metadata_tag',
  tac_operation: 'tac_operation',
} as const;

export type SearchResultType = typeof SEARCH_RESULT_TYPES[keyof typeof SEARCH_RESULT_TYPES];

export interface SearchResultToken {
  type: 'token';
  name: string;
  symbol: string;
  address_hash: string;
  token_url: string;
  address_url: string;
  icon_url: string | null;
  token_type: TokenType;
  exchange_rate: string | null;
  total_supply: string | null;
  is_verified_via_admin_panel: boolean;
  is_smart_contract_verified: boolean;
  filecoin_robust_address?: string | null;
  certified?: boolean;
  reputation: TokenReputation | null;
}

type SearchResultEnsInfo = {
  address_hash: string;
  expiry_date?: string;
  name: string;
  names_count: number;
} | null;

interface SearchResultAddressData {
  name: string | null;
  address_hash: string;
  is_smart_contract_verified: boolean;
  certified?: true;
  filecoin_robust_address?: string | null;
  url?: string; // not used by the frontend, we build the url ourselves
}

export interface SearchResultAddressOrContract extends SearchResultAddressData {
  type: 'address' | 'contract';
  ens_info?: SearchResultEnsInfo;
}

export interface SearchResultTacOperation {
  type: 'tac_operation';
  tac_operation: tac.OperationDetails;
}

export interface SearchResultMetadataTag extends SearchResultAddressData {
  type: 'metadata_tag';
  ens_info?: SearchResultEnsInfo;
  metadata: AddressMetadataTagApi;
}

export interface SearchResultDomain extends SearchResultAddressData {
  type: 'ens_domain';
  ens_info: {
    address_hash: string;
    expiry_date?: string;
    name: string;
    names_count: number;
    protocol?: bens.ProtocolInfo;
  };
}

export interface SearchResultCluster extends SearchResultAddressData {
  type: 'cluster';
  cluster_info: {
    cluster_id: string;
    name: string;
    owner: string;
    created_at?: string;
    expires_at?: string | null;
    total_wei_amount?: string;
    is_testnet?: boolean;
  };
}

// Backend emits `type: "label"` for category-expansion search hits
// (the search term matched a curated category name like "Project") and
// `type: "tag"` for tsvector-only hits on the specific display_name
// (e.g., "VIR Ecosystem Wallet"). The frontend buckets the two into
// the Labels vs Public tags categories of the search dropdown; the
// payload shape is identical so they share one TS interface.
interface SearchResultTagLikeBase {
  address_hash: string;
  filecoin_robust_address?: string | null;
  name: string;
  is_smart_contract_verified: boolean;
  url?: string; // not used by the frontend, we build the url ourselves
  // Enriched by backend (vinuexplorer-backend feat/tag-aware-search-and-holder-analytics)
  tag_label?: string;
  tag_type?: string;
  metadata?: AddressMetadataTagApi['meta'] | null;
}

export interface SearchResultLabel extends SearchResultTagLikeBase {
  type: 'label';
}

export interface SearchResultTag extends SearchResultTagLikeBase {
  type: 'tag';
}

export interface SearchResultBlock {
  type: 'block';
  block_type?: 'block' | 'reorg' | 'uncle';
  block_number: number | string;
  block_hash: string;
  timestamp: string;
  url?: string; // not used by the frontend, we build the url ourselves
}

export interface SearchResultTx {
  type: 'transaction';
  transaction_hash: string;
  timestamp: string;
  url?: string; // not used by the frontend, we build the url ourselves
}

export interface SearchResultBlob {
  type: 'blob';
  blob_hash: string;
  timestamp: null;
}

export interface SearchResultUserOp {
  type: 'user_operation';
  user_operation_hash: string;
  timestamp: string;
  url?: string; // not used by the frontend, we build the url ourselves
}

export type SearchResultItem =
  SearchResultToken |
  SearchResultAddressOrContract |
  SearchResultBlock |
  SearchResultTx |
  SearchResultLabel |
  SearchResultTag |
  SearchResultUserOp |
  SearchResultBlob |
  SearchResultDomain |
  SearchResultCluster |
  SearchResultMetadataTag |
  SearchResultTacOperation;

export interface SearchResult {
  items: Array<SearchResultItem>;
  next_page_params: {
    address_hash: string | null;
    block_hash: string | null;
    holders_count: number | null;
    inserted_at: string | null;
    item_type: SearchResultType;
    items_count: number;
    name: string;
    q: string;
    transaction_hash: string | null;
  } | null;
}

export interface SearchResultFilters {
  q: string;
}

export interface SearchRedirectResult {
  parameter: string | null;
  redirect: boolean;
  type: 'address' | 'block' | 'transaction' | 'user_operation' | 'blob' | null;
}
