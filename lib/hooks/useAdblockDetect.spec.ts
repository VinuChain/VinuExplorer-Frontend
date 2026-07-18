import { describe, expect, it } from 'vitest';

import { getAdblockDetectProvider } from './useAdblockDetect';

describe('getAdblockDetectProvider', () => {
  it('uses Coinzilla when only text ads are enabled', () => {
    expect(getAdblockDetectProvider(
      { title: 'Banner ads', isEnabled: false },
      { title: 'Text ads', isEnabled: true, provider: 'coinzilla' },
    )).toBe('coinzilla');
  });

  it('uses the banner provider when both banner and text ads are enabled', () => {
    expect(getAdblockDetectProvider(
      { title: 'Banner ads', isEnabled: true, provider: 'slise', isSpecifyEnabled: false },
      { title: 'Text ads', isEnabled: true, provider: 'coinzilla' },
    )).toBe('slise');
  });

  it('does not run detection when no ad feature is enabled', () => {
    expect(getAdblockDetectProvider(
      { title: 'Banner ads', isEnabled: false },
      { title: 'Text ads', isEnabled: false },
    )).toBeUndefined();
  });
});
