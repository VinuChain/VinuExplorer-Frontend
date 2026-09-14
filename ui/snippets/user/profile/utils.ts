import config from 'configs/app';
import { getAuthProviderUrl } from 'ui/snippets/auth/redirectToAuthProvider';

export function getUserHandle(email: string) {
  return email.split('@')[0];
}

// External auth replaces the auth modal and its wallet option,
// so without a profile the menu is the only place left to connect a wallet.
export function hasWalletConnectOnlyInMenu() {
  return config.features.blockchainInteraction.isEnabled && Boolean(getAuthProviderUrl());
}
