import BigNumber from 'bignumber.js';

const WEI = new BigNumber(10).pow(18);

// The SFC reports every amount in wei. These are chain-scale numbers - total
// supply is ~1.07e27 wei - so they arrive as strings and are divided here
// rather than being coerced through a JS number, which would lose precision
// well before the integer part.
export function formatVc(wei: string, decimals = 2): string {
  const value = new BigNumber(wei);

  if (!value.isFinite()) {
    return '-';
  }

  return value.dividedBy(WEI).toFormat(decimals);
}

// Epoch durations run to hours, so hh:mm:ss rather than a relative phrase -
// "4 hours ago" would lose the seconds that distinguish one epoch from the next.
export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return '-';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${ pad(hours) }:${ pad(minutes) }:${ pad(rest) }`;
}
