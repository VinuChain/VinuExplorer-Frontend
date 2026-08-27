import type { HomeStats } from 'types/api/stats';

import { describe, it, expect } from 'vitest';

import { enrichGasStats } from './enrichGasData';

// Mirrors the live VinuChain /api/v2/stats payload: one price for every tier,
// no confirmation times, no oracle timestamp.
const tier = { fiat_price: null, price: 20, time: null, base_fee: null, priority_fee: null };
const gasPrices = { fast: { ...tier }, average: { ...tier }, slow: { ...tier } };
const stats = {
  average_block_time: 9576,
  coin_price: '0.5',
  gas_prices: gasPrices,
  gas_price_updated_at: null,
  gas_prices_update_in: 0,
} as HomeStats;

describe('enrichGasStats', () => {
  it('computes fiat_price only and never invents confirmation times or a last-update timestamp', () => {
    const result = enrichGasStats(stats);

    expect(result.gas_prices?.fast?.fiat_price).toBe('0.00021');
    expect(result.gas_prices?.fast?.time).toBeNull();
    expect(result.gas_prices?.average?.time).toBeNull();
    expect(result.gas_prices?.slow?.time).toBeNull();
    expect(result.gas_price_updated_at).toBeNull();
    expect(result.gas_prices_update_in).toBe(0);
  });

  it('keeps backend-provided fiat_price, time and timestamp untouched', () => {
    const provided = {
      ...stats,
      gas_prices: { ...gasPrices, fast: { ...tier, fiat_price: '1.26', time: 9321 } },
      gas_price_updated_at: '2022-11-11T11:09:49.051171Z',
    } as HomeStats;

    const result = enrichGasStats(provided);

    expect(result.gas_prices?.fast).toEqual({ ...tier, fiat_price: '1.26', time: 9321 });
    expect(result.gas_price_updated_at).toBe('2022-11-11T11:09:49.051171Z');
  });
});
