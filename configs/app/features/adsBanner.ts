import type { Feature } from './types';
import type { AdButlerConfig } from 'types/client/adButlerConfig';
import { SUPPORTED_AD_BANNER_PROVIDERS } from 'types/client/adProviders';
import type { AdBannerProviders, AdBannerAdditionalProviders } from 'types/client/adProviders';

import { getEnvValue, parseEnvJson } from '../utils';

function isPositiveAdButlerDimension(value: unknown): boolean {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return false;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0;
}

function isAdButlerConfig(value: unknown): value is AdButlerConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const config = value as Partial<AdButlerConfig>;

  return typeof config.id === 'string' && Boolean(config.id) &&
    isPositiveAdButlerDimension(config.width) && isPositiveAdButlerDimension(config.height);
}

const additionalProvider = getEnvValue('NEXT_PUBLIC_AD_BANNER_ADDITIONAL_PROVIDER') as AdBannerAdditionalProviders;
const isSpecifyEnabled = getEnvValue('NEXT_PUBLIC_AD_BANNER_ENABLE_SPECIFY') === 'true';
const adButlerConfig = (() => {
  const desktop = parseEnvJson<AdButlerConfig>(getEnvValue('NEXT_PUBLIC_AD_ADBUTLER_CONFIG_DESKTOP'));
  const mobile = parseEnvJson<AdButlerConfig>(getEnvValue('NEXT_PUBLIC_AD_ADBUTLER_CONFIG_MOBILE'));

  return isAdButlerConfig(desktop) && isAdButlerConfig(mobile) ? { desktop, mobile } : undefined;
})();
const hasAdditionalAdButlerConfig = Boolean(
  additionalProvider === 'adbutler' && adButlerConfig,
);

const provider: AdBannerProviders = (() => {
  const envValue = getEnvValue('NEXT_PUBLIC_AD_BANNER_PROVIDER') as AdBannerProviders;

  if (envValue && SUPPORTED_AD_BANNER_PROVIDERS.includes(envValue)) {
    return envValue;
  }

  return hasAdditionalAdButlerConfig || isSpecifyEnabled ? 'slise' : 'none';
})();

const title = 'Banner ads';

type AdsBannerFeatureProviderPayload = {
  provider: Exclude<AdBannerProviders, 'adbutler' | 'none'>;
} | {
  provider: 'adbutler';
  adButler: {
    config: {
      desktop: AdButlerConfig;
      mobile: AdButlerConfig;
    };
  };
} | {
  provider: Exclude<AdBannerProviders, 'adbutler' | 'none'>;
  additionalProvider: 'adbutler';
  adButler: {
    config: {
      desktop: AdButlerConfig;
      mobile: AdButlerConfig;
    };
  };
};

type AdsBannerFeaturePayload = AdsBannerFeatureProviderPayload & {
  isSpecifyEnabled: boolean;
};

const config: Feature<AdsBannerFeaturePayload> = (() => {
  if (provider === 'adbutler') {
    if (adButlerConfig) {
      return Object.freeze({
        title,
        isEnabled: true,
        provider,
        adButler: {
          config: {
            desktop: adButlerConfig.desktop,
            mobile: adButlerConfig.mobile,
          },
        },
        isSpecifyEnabled,
      });
    }
  } else if (provider !== 'none') {

    if (additionalProvider === 'adbutler' && adButlerConfig) {
      return Object.freeze({
        title,
        isEnabled: true,
        provider,
        additionalProvider,
        adButler: {
          config: {
            desktop: adButlerConfig.desktop,
            mobile: adButlerConfig.mobile,
          },
        },
        isSpecifyEnabled,
      });
    }
    return Object.freeze({
      title,
      isEnabled: true,
      provider,
      isSpecifyEnabled,
    });
  }

  return Object.freeze({
    title,
    isEnabled: false,
  });
})();

export default config;
