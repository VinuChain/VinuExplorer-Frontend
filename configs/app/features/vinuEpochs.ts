import type { Feature } from './types';

import { getEnvValue } from '../utils';

const title = 'VinuChain staking epochs';

// Reads the SFC contract, so it is only meaningful on a chain that has one.
// Off by default rather than inferred from the chain id, so a deployment opts
// in explicitly and the upstream Celo epochs feature stays independent.
const config: Feature<{ }> = (() => {
  if (getEnvValue('NEXT_PUBLIC_VINU_EPOCHS_ENABLED') === 'true') {
    return Object.freeze({
      title,
      isEnabled: true,
    });
  }

  return Object.freeze({
    title,
    isEnabled: false,
  });
})();

export default config;
