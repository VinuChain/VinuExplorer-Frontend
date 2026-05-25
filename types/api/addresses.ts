import type { AddressParam } from './addressParams';

export type AddressesItem = AddressParam & { transactions_count: string; coin_balance: string | null };

export type AddressesResponse = {
  items: Array<AddressesItem>;
  next_page_params: {
    fetched_coin_balance: string;
    hash: string;
    items_count: number;
  } | null;
  total_supply: string;
};

export interface AddressesMetadataSearchResult {
  items: Array<AddressesItem>;
  next_page_params: { page_token: string } | null;
}

export interface AddressesMetadataSearchFilters {
  // Optional — when omitted the backend's category-only branch
  // filters by tag_type alone (see AddressTagSearch.list_by_type/2).
  // The frontend sends `undefined` from AccountsLabelSearch when the
  // route's slug path-param is the CATEGORY_BROWSE_SLUG sentinel.
  slug?: string;
  tag_type: string;
}
