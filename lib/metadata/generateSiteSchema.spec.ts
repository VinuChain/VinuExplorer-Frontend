import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('generateSiteSchema', () => {
  describe('mainnet host', () => {
    beforeEach(async() => {
      vi.resetModules();
      vi.doMock('configs/app', () => ({
        'default': {
          app: { baseUrl: 'https://mainnet.vinuexplorer.org' },
        },
      }));
    });

    it('returns two schema objects for the landing route', async() => {
      const { 'default': generateSiteSchema } = await import('./generateSiteSchema');
      const result = generateSiteSchema('/');
      expect(result).toHaveLength(2);
    });

    it('emits Organization with mainnet URL and sameAs links', async() => {
      const { 'default': generateSiteSchema } = await import('./generateSiteSchema');
      const result = generateSiteSchema('/');
      const org = result?.[0];
      expect(org?.['@type']).toBe('Organization');
      expect(org?.url).toBe('https://mainnet.vinuexplorer.org');
      expect((org as { sameAs?: Array<string> }).sameAs).toContain('https://www.vinuchain.org');
      expect((org as { sameAs?: Array<string> }).sameAs).toContain('https://vinuchain.vinuswap.org');
      expect((org as { sameAs?: Array<string> }).sameAs).toContain('https://www.vinufinance.app');
      expect((org as { sameAs?: Array<string> }).sameAs).toContain('https://vinufoundation.org');
    });

    it('emits WebSite with mainnet URL', async() => {
      const { 'default': generateSiteSchema } = await import('./generateSiteSchema');
      const result = generateSiteSchema('/');
      const site = result?.[1];
      expect(site?.['@type']).toBe('WebSite');
      expect(site?.url).toBe('https://mainnet.vinuexplorer.org');
      expect(site?.name).toBe('VinuExplorer');
    });

    it('returns undefined for non-landing routes', async() => {
      const { 'default': generateSiteSchema } = await import('./generateSiteSchema');
      expect(generateSiteSchema('/txs')).toBeUndefined();
      expect(generateSiteSchema('/tx/[hash]')).toBeUndefined();
      expect(generateSiteSchema('/block/[height_or_hash]')).toBeUndefined();
    });
  });

  describe('testnet host', () => {
    beforeEach(async() => {
      vi.resetModules();
      vi.doMock('configs/app', () => ({
        'default': {
          app: { baseUrl: 'https://testnet.vinuexplorer.org' },
        },
      }));
    });

    it('emits Organization with testnet URL', async() => {
      const { 'default': generateSiteSchema } = await import('./generateSiteSchema');
      const result = generateSiteSchema('/');
      const org = result?.[0];
      expect(org?.['@type']).toBe('Organization');
      expect(org?.url).toBe('https://testnet.vinuexplorer.org');
    });

    it('emits WebSite with testnet URL', async() => {
      const { 'default': generateSiteSchema } = await import('./generateSiteSchema');
      const result = generateSiteSchema('/');
      const site = result?.[1];
      expect(site?.['@type']).toBe('WebSite');
      expect(site?.url).toBe('https://testnet.vinuexplorer.org');
    });
  });
});
