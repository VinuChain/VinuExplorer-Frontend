import type { GasPriceInfo, GasPrices, HomeStats } from 'types/api/stats';

// Compute USD fiat_price (gwei × 1e-9 × 21,000 gas × coin_price) when the backend omits it.
// Nothing else is synthesised: confirmation `time` and `gas_price_updated_at` are passed through
// as sent (the VinuChain backend returns null for both), so the UI hides them instead of
// presenting invented estimates or the browser fetch time as oracle data.
function enrichGasTier(gas: GasPriceInfo | null, coinPrice: string | null): GasPriceInfo | null {
  if (!gas) {
    return gas;
  }
  const result = { ...gas };
  if (result.fiat_price === null && result.price !== null && coinPrice) {
    result.fiat_price = (Number(result.price) * 1e-9 * 21_000 * Number(coinPrice)).toString();
  }
  return result;
}

export function enrichGasStats(data: HomeStats): HomeStats {
  if (!data.gas_prices) {
    return data;
  }
  const coinPrice = data.coin_price ?? null;

  const enrichedGasPrices: GasPrices = {
    fast: enrichGasTier(data.gas_prices.fast, coinPrice),
    average: enrichGasTier(data.gas_prices.average, coinPrice),
    slow: enrichGasTier(data.gas_prices.slow, coinPrice),
  };

  return {
    ...data,
    gas_prices: enrichedGasPrices,
  };
}
