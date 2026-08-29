// VinuChain staking epochs, read from the SFC contract.
//
// Amounts arrive as decimal strings in wei: they exceed the range a JSON
// number carries safely, so the API sends them as strings and the UI formats.
export interface VinuEpoch {
  number: number;
  end_time: string | null;
  // The SFC does not store duration; the backend derives it from the previous
  // epoch's end time, and it is null for the oldest epoch on a page and for
  // epoch 1, which has no predecessor.
  duration_seconds: number | null;
  epoch_fee: string;
  total_base_reward_weight: string;
  total_tx_reward_weight: string;
  base_reward_per_second: string;
  total_stake: string;
  total_supply: string;
}

export interface VinuEpochsResponse {
  items: Array<VinuEpoch>;
  next_page_params: { from: number } | null;
}
