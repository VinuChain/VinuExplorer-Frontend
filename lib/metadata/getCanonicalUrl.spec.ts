import { describe, it, expect, vi, beforeEach } from 'vitest';

// getCanonicalUrl depends on config.app.baseUrl which is derived from
// NEXT_PUBLIC_APP_HOST at module import time.  We mock the config module
// to pin the baseUrl per test so both mainnet and testnet hosts are verified
// without needing a real browser environment.

describe('getCanonicalUrl', () => {
  describe('mainnet host (mainnet.vinuexplorer.org)', () => {
    beforeEach(async() => {
      vi.resetModules();
      vi.doMock('configs/app', () => ({
        'default': {
          app: { baseUrl: 'https://mainnet.vinuexplorer.org' },
        },
      }));
    });

    it('returns full mainnet URL for canonical routes', async() => {
      const { 'default': getCanonicalUrl } = await import('./getCanonicalUrl');
      expect(getCanonicalUrl('/')).toBe('https://mainnet.vinuexplorer.org/');
      expect(getCanonicalUrl('/txs')).toBe('https://mainnet.vinuexplorer.org/txs');
      expect(getCanonicalUrl('/tokens')).toBe('https://mainnet.vinuexplorer.org/tokens');
    });

    it('returns undefined for dynamic (non-canonical) routes', async() => {
      const { 'default': getCanonicalUrl } = await import('./getCanonicalUrl');
      expect(getCanonicalUrl('/tx/[hash]')).toBeUndefined();
      expect(getCanonicalUrl('/block/[height_or_hash]')).toBeUndefined();
      expect(getCanonicalUrl('/address/[hash]')).toBeUndefined();
      expect(getCanonicalUrl('/token/[hash]')).toBeUndefined();
    });
  });

  describe('testnet host (testnet.vinuexplorer.org)', () => {
    beforeEach(async() => {
      vi.resetModules();
      vi.doMock('configs/app', () => ({
        'default': {
          app: { baseUrl: 'https://testnet.vinuexplorer.org' },
        },
      }));
    });

    it('returns full testnet URL for canonical routes', async() => {
      const { 'default': getCanonicalUrl } = await import('./getCanonicalUrl');
      expect(getCanonicalUrl('/')).toBe('https://testnet.vinuexplorer.org/');
      expect(getCanonicalUrl('/txs')).toBe('https://testnet.vinuexplorer.org/txs');
      expect(getCanonicalUrl('/tokens')).toBe('https://testnet.vinuexplorer.org/tokens');
    });

    it('returns undefined for dynamic routes on testnet', async() => {
      const { 'default': getCanonicalUrl } = await import('./getCanonicalUrl');
      expect(getCanonicalUrl('/tx/[hash]')).toBeUndefined();
      expect(getCanonicalUrl('/address/[hash]')).toBeUndefined();
    });
  });
});
