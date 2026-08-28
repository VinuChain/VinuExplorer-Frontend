import Cookies from 'js-cookie';

import config from 'configs/app';
import { isBrowser } from 'toolkit/utils/isBrowser';

export enum NAMES {
  NAV_BAR_COLLAPSED = 'nav_bar_collapsed',
  API_TOKEN = '_explorer_key',
  API_TEMP_TOKEN = 'api_temp_token',
  REWARDS_API_TOKEN = 'rewards_api_token',
  REWARDS_REFERRAL_CODE = 'rewards_ref_code',
  TXS_SORT = 'txs_sort',
  COLOR_MODE = 'chakra-ui-color-mode',
  COLOR_THEME = 'chakra-ui-color-theme',
  ADDRESS_IDENTICON_TYPE = 'address_identicon_type',
  ADDRESS_FORMAT = 'address_format',
  TIME_FORMAT = 'time_format',
  INDEXING_ALERT = 'indexing_alert',
  ADBLOCK_DETECTED = 'adblock_detected',
  MIXPANEL_DEBUG = '_mixpanel_debug',
  ADDRESS_NFT_DISPLAY_TYPE = 'address_nft_display_type',
  HIDE_ADD_TO_WALLET_BUTTON = 'hide_add_to_wallet_button',
  UUID = 'uuid',
  SHOW_SCAM_TOKENS = 'show_scam_tokens',
}

// Upstream #3301 (ebaacc566). Upstream defaults `protocol` to https in configs/app/app.ts;
// the fork's app.ts leaves it undefined when NEXT_PUBLIC_APP_PROTOCOL is unset, hence the fallback here.
export const getDefaultAttributes = () => ({
  path: '/',
  secure: (config.app.protocol || 'https') === 'https',
});

export function get(name?: NAMES | undefined | null, serverCookie?: string) {
  if (!isBrowser()) {
    return serverCookie ? getFromCookieString(serverCookie, name) : undefined;
  }

  if (name) {
    return Cookies.get(name);
  }
}

export function set(name: NAMES, value: string, attributes: Cookies.CookieAttributes = {}) {
  return Cookies.set(name, value, { ...getDefaultAttributes(), ...attributes });
}

export function remove(name: NAMES, attributes: Cookies.CookieAttributes = {}) {
  return Cookies.remove(name, { ...getDefaultAttributes(), ...attributes });
}

export function getFromCookieString(cookieString: string, name?: NAMES | undefined | null) {
  return cookieString.split(`${ name }=`)[1]?.split(';')[0];
}
