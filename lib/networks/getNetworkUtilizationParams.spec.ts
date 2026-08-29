import { describe, expect, it } from 'vitest';

import getNetworkUtilizationParams from './getNetworkUtilizationParams';

describe('getNetworkUtilizationParams', () => {
  // Every caller prints value.toFixed(2), so a value under 0.01 renders as
  // "0.00%". Shown next to the green "Low load" label that is a health claim
  // about a number too small to have measured - VinuChain mainnet reads around
  // 1.6e-08%. The gas tracker hid it on this threshold while the home page and
  // blocks tab did not, so the threshold lives here and all three agree.
  it.each([ 0, 1.73e-8, 0.0099 ])('treats %p as not measurable', (value) => {
    expect(getNetworkUtilizationParams(value).isMeasurable).toBe(false);
  });

  it.each([ 0.01, 12.5, 100 ])('treats %p as measurable', (value) => {
    expect(getNetworkUtilizationParams(value).isMeasurable).toBe(true);
  });

  it('still classifies load and colour', () => {
    expect(getNetworkUtilizationParams(90).load).toBe('high');
    expect(getNetworkUtilizationParams(60).load).toBe('medium');
    expect(getNetworkUtilizationParams(10).load).toBe('low');
  });
});
