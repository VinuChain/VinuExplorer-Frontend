import { afterEach, describe, expect, it, vi } from 'vitest';

/* eslint-disable no-restricted-properties -- Feature modules read env at import time, so these tests control process.env before dynamic imports. */

const CONTROLLED_ENV_KEYS = [
  'NEXT_PUBLIC_AD_TEXT_PROVIDER',
  'NEXT_PUBLIC_AD_BANNER_PROVIDER',
  'NEXT_PUBLIC_AD_BANNER_ADDITIONAL_PROVIDER',
  'NEXT_PUBLIC_AD_ADBUTLER_CONFIG_DESKTOP',
  'NEXT_PUBLIC_AD_ADBUTLER_CONFIG_MOBILE',
  'NEXT_PUBLIC_AD_BANNER_ENABLE_SPECIFY',
  'NEXT_PUBLIC_MARKETPLACE_ENABLED',
  'NEXT_PUBLIC_MARKETPLACE_CONFIG_URL',
  'NEXT_PUBLIC_MARKETPLACE_SUBMIT_FORM',
  'NEXT_PUBLIC_MARKETPLACE_CATEGORIES_URL',
  'NEXT_PUBLIC_MARKETPLACE_SUGGEST_IDEAS_FORM',
  'NEXT_PUBLIC_MARKETPLACE_FEATURED_APP',
  'NEXT_PUBLIC_MARKETPLACE_BANNER_CONTENT_URL',
  'NEXT_PUBLIC_MARKETPLACE_BANNER_LINK_URL',
  'NEXT_PUBLIC_MARKETPLACE_GRAPH_LINKS_URL',
  'NEXT_PUBLIC_MARKETPLACE_ESSENTIAL_DAPPS_CONFIG',
  'NEXT_PUBLIC_MARKETPLACE_ESSENTIAL_DAPPS_AD_ENABLED',
  'NEXT_PUBLIC_MARKETPLACE_TITLES',
  'NEXT_PUBLIC_ADMIN_SERVICE_API_HOST',
  'NEXT_PUBLIC_NETWORK_RPC_URL',
  'NEXT_PUBLIC_GOOGLE_ANALYTICS_PROPERTY_ID',
  'NEXT_PUBLIC_GROWTH_BOOK_CLIENT_KEY',
] as const;

const ORIGINAL_ENV = new Map(CONTROLLED_ENV_KEYS.map((key) => [ key, process.env[key] ]));

function setEnv(overrides: Record<string, string>) {
  vi.resetModules();

  CONTROLLED_ENV_KEYS.forEach((key) => {
    delete process.env[key];
  });

  Object.entries(overrides).forEach(([ key, value ]) => {
    process.env[key] = value;
  });
}

function restoreEnv() {
  CONTROLLED_ENV_KEYS.forEach((key) => {
    const value = ORIGINAL_ENV.get(key);

    if (typeof value === 'string') {
      process.env[key] = value;
    } else {
      delete process.env[key];
    }
  });
}

async function loadAdsText(overrides: Record<string, string> = {}) {
  setEnv(overrides);
  const { 'default': feature } = await import('./adsText');
  return feature;
}

async function loadAdsBanner(overrides: Record<string, string> = {}) {
  setEnv(overrides);
  const { 'default': feature } = await import('./adsBanner');
  return feature;
}

async function loadMarketplace(overrides: Record<string, string> = {}) {
  setEnv(overrides);
  const { 'default': feature } = await import('./marketplace');
  return feature;
}

async function loadGoogleAnalytics(overrides: Record<string, string> = {}) {
  setEnv(overrides);
  const { 'default': feature } = await import('./googleAnalytics');
  return feature;
}

async function loadGrowthBook(overrides: Record<string, string> = {}) {
  setEnv(overrides);
  const { 'default': feature } = await import('./growthBook');
  return feature;
}

afterEach(() => {
  restoreEnv();
  vi.resetModules();
});

describe('VinuExplorer monetization feature defaults', () => {
  it('keeps text ads disabled unless a supported provider is explicit', async() => {
    await expect(loadAdsText()).resolves.toEqual({
      title: 'Text ads',
      isEnabled: false,
    });

    await expect(loadAdsText({ NEXT_PUBLIC_AD_TEXT_PROVIDER: 'unsupported' })).resolves.toEqual({
      title: 'Text ads',
      isEnabled: false,
    });

    await expect(loadAdsText({ NEXT_PUBLIC_AD_TEXT_PROVIDER: 'coinzilla' })).resolves.toMatchObject({
      isEnabled: true,
      provider: 'coinzilla',
    });
  });

  it('keeps banner ads disabled unless a supported provider is explicit', async() => {
    await expect(loadAdsBanner()).resolves.toEqual({
      title: 'Banner ads',
      isEnabled: false,
    });

    await expect(loadAdsBanner({ NEXT_PUBLIC_AD_BANNER_PROVIDER: 'unsupported' })).resolves.toEqual({
      title: 'Banner ads',
      isEnabled: false,
    });

    await expect(loadAdsBanner({ NEXT_PUBLIC_AD_BANNER_PROVIDER: 'slise' })).resolves.toMatchObject({
      isEnabled: true,
      provider: 'slise',
      isSpecifyEnabled: false,
    });
  });

  it('keeps marketplace disabled unless the enable flag and required sources are explicit', async() => {
    const marketplaceSources = {
      NEXT_PUBLIC_NETWORK_RPC_URL: 'https://rpc.vinuexplorer.example',
      NEXT_PUBLIC_MARKETPLACE_CONFIG_URL: 'https://cdn.vinuexplorer.example/marketplace.json',
      NEXT_PUBLIC_MARKETPLACE_SUBMIT_FORM: 'https://forms.vinuexplorer.example/submit',
    };

    await expect(loadMarketplace(marketplaceSources)).resolves.toEqual({
      title: 'Marketplace',
      isEnabled: false,
    });

    await expect(loadMarketplace({
      NEXT_PUBLIC_MARKETPLACE_ENABLED: 'true',
      NEXT_PUBLIC_NETWORK_RPC_URL: marketplaceSources.NEXT_PUBLIC_NETWORK_RPC_URL,
      NEXT_PUBLIC_MARKETPLACE_CONFIG_URL: marketplaceSources.NEXT_PUBLIC_MARKETPLACE_CONFIG_URL,
    })).resolves.toEqual({
      title: 'Marketplace',
      isEnabled: false,
    });

    await expect(loadMarketplace({
      NEXT_PUBLIC_MARKETPLACE_ENABLED: 'true',
      ...marketplaceSources,
    })).resolves.toMatchObject({
      isEnabled: true,
      configUrl: '/assets/configs/marketplace_config.json',
      submitFormUrl: marketplaceSources.NEXT_PUBLIC_MARKETPLACE_SUBMIT_FORM,
    });
  });

  it('keeps analytics and experiment providers disabled unless keys are explicit', async() => {
    await expect(loadGoogleAnalytics()).resolves.toEqual({
      title: 'Google analytics',
      isEnabled: false,
    });

    await expect(loadGoogleAnalytics({ NEXT_PUBLIC_GOOGLE_ANALYTICS_PROPERTY_ID: 'G-VINUEXPLORER' })).resolves.toMatchObject({
      isEnabled: true,
      propertyId: 'G-VINUEXPLORER',
    });

    await expect(loadGrowthBook()).resolves.toEqual({
      title: 'GrowthBook feature flagging and A/B testing',
      isEnabled: false,
    });

    await expect(loadGrowthBook({ NEXT_PUBLIC_GROWTH_BOOK_CLIENT_KEY: 'sdk-vinuexplorer' })).resolves.toMatchObject({
      isEnabled: true,
      clientKey: 'sdk-vinuexplorer',
    });
  });
});
