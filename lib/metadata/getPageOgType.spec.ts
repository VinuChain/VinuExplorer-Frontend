import { describe, expect, it } from 'vitest';

import getPageOgType from './getPageOgType';

describe('getPageOgType', () => {
  it('classifies the Prometheus metrics route as a service API endpoint', () => {
    expect(getPageOgType('/api/metrics')).toBe('Service API endpoint');
  });

  it('keeps ordinary pages classified separately from service API endpoints', () => {
    expect(getPageOgType('/')).toBe('Homepage');
    expect(getPageOgType('/txs')).toBe('Root page');
    expect(getPageOgType('/tx/[hash]')).toBe('Regular page');
  });
});
