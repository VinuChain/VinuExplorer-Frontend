/**
 * Make SafePal visible to AppKit as an installed wallet.
 *
 * AppKit lists an injected wallet only when it announces itself over EIP-6963:
 * a plain `window.ethereum` wallet gets no row at all here (verified on
 * production with a MetaMask fixture). SafePal often does not announce, and is
 * often not on `window.ethereum` either — its extension, installed but not
 * the default, leaves MetaMask there and SafePal only on
 * `window.safepalProvider`. Both were reproduced on production as a modal
 * offering only WalletConnect.
 *
 * Announcing the SafePal provider ourselves routes it through AppKit's own
 * EIP-6963 path: "SafePal — installed", connecting to exactly that provider.
 * Verified against production with the announcement injected by a fixture.
 *
 * If SafePal already announces itself this stays silent, so a 6963-capable
 * SafePal never renders two rows.
 */

// SafePal's mark, as shipped by RainbowKit's safepalWallet (MIT). EIP-6963
// requires the icon to be a data URI, which cannot be wrapped.
// eslint-disable-next-line max-len
const SAFEPAL_ICON = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2028%2028%22%3E%3Cpath%20fill%3D%22%234A21EF%22%20d%3D%22M0%200h28v28H0z%22%2F%3E%3Cg%20fill%3D%22%23F7F6FF%22%20clip-path%3D%22url(%23a)%22%3E%3Cpath%20d%3D%22M13.014%206c-.487%200-.954.193-1.298.538l-5.409%205.409a1.046%201.046%200%200%200%200%201.483l3.545%203.545V10.7c0-.468.377-.848.845-.848h7.451L22%206h-8.986ZM9.852%2018.148H17.3c.469%200%20.848-.38.848-.848v-6.275l3.545%203.545a1.046%201.046%200%200%201%200%201.483l-5.409%205.41a1.836%201.836%200%200%201-1.298.537H6l3.852-3.852Z%22%2F%3E%3C%2Fg%3E%3Cdefs%3E%3CclipPath%20id%3D%22a%22%3E%3Cpath%20fill%3D%22%23fff%22%20d%3D%22M6%206h16v16H6z%22%2F%3E%3C%2FclipPath%3E%3C%2Fdefs%3E%3C%2Fsvg%3E';

// SafePal publishes no rdns in the WalletConnect registry; this follows the
// reverse-DNS convention for its own domain.
const SAFEPAL_RDNS = 'com.safepal';

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
}

interface SafePalWindow {
  ethereum?: unknown;
  safepalProvider?: unknown;
}

const isProvider = (value: unknown): value is Eip1193Provider =>
  Boolean(value) && typeof (value as Eip1193Provider).request === 'function';

const isSafePal = (value: unknown) =>
  Boolean(value) && (value as { isSafePal?: unknown }).isSafePal === true;

/**
 * The SafePal provider in any shape SafePal injects, or null: the namespace,
 * then a SafePal entry in the multi-extension providers array, then a flagged
 * window.ethereum.
 */
export function findSafePalProvider(win: SafePalWindow): Eip1193Provider | null {
  if (isProvider(win.safepalProvider)) {
    return win.safepalProvider;
  }
  const ethereum = win.ethereum as { providers?: unknown } | undefined;
  if (!ethereum) {
    return null;
  }
  if (Array.isArray(ethereum.providers)) {
    const hit = ethereum.providers.find(isSafePal);
    if (isProvider(hit)) {
      return hit;
    }
  }
  return isSafePal(ethereum) && isProvider(ethereum) ? ethereum : null;
}

const newUuid = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ?
    crypto.randomUUID() :
    '8f3e2a4c-5b6d-4e7f-9a1b-2c3d4e5f6a7b';

type AnnounceTarget = SafePalWindow & EventTarget;

// A wallet can inject after this module runs (a slow content script, a mobile
// in-app browser). Same budget as the landing site's AddToWallet button:
// re-check every 400ms for 3.2s, alongside the events that mark injection.
const LATE_INJECTION_POLL_MS = 400;
const LATE_INJECTION_MAX_TRIES = 8;

function startAnnouncing(win: AnnounceTarget, provider: Eip1193Provider) {
  // EIP-6963 wallets answer requestProvider synchronously, so one request
  // settles whether SafePal speaks the protocol itself.
  let selfAnnounced = false;
  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent<{ info?: { name?: string; rdns?: string }; provider?: unknown }>).detail;
    if (detail?.provider === provider || /safepal/i.test(`${ detail?.info?.name ?? '' } ${ detail?.info?.rdns ?? '' }`)) {
      selfAnnounced = true;
    }
  };
  win.addEventListener('eip6963:announceProvider', onAnnounce);
  win.dispatchEvent(new Event('eip6963:requestProvider'));
  win.removeEventListener('eip6963:announceProvider', onAnnounce);
  if (selfAnnounced) {
    return;
  }

  const detail = Object.freeze({
    info: Object.freeze({ uuid: newUuid(), name: 'SafePal', icon: SAFEPAL_ICON, rdns: SAFEPAL_RDNS }),
    provider,
  });
  const announce = () => win.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail }));
  win.addEventListener('eip6963:requestProvider', announce);
  announce();
}

/**
 * Announce SafePal over EIP-6963 unless it already does so. Call before
 * createAppKit. Never throws: a wallet shim must not take the page down.
 *
 * If SafePal is not on the page yet, keep watching briefly rather than giving
 * up: AppKit's EIP-6963 store keeps its announceProvider listener for the life
 * of the page, so an announcement made seconds later still adds the row. Stops
 * at the first of: SafePal found, SafePal announcing itself, or the poll
 * budget running out.
 */
export default function announceSafePal(
  win: AnnounceTarget | undefined = typeof window !== 'undefined' ? window : undefined,
): void {
  if (!win) {
    return;
  }
  try {
    const provider = findSafePalProvider(win);
    if (provider) {
      startAnnouncing(win, provider);
      return;
    }

    let done = false;
    let tries = 0;
    const stop = () => {
      done = true;
      clearInterval(pollId);
      win.removeEventListener('ethereum#initialized', check);
      win.removeEventListener('eip6963:announceProvider', onSelfAnnounce);
    };
    function check() {
      if (done) {
        return;
      }
      const late = findSafePalProvider(win as AnnounceTarget);
      if (late) {
        stop();
        startAnnouncing(win as AnnounceTarget, late);
      }
    }
    // A SafePal that announces itself needs nothing from us.
    const onSelfAnnounce = (event: Event) => {
      const info = (event as CustomEvent<{ info?: { name?: string; rdns?: string } }>).detail?.info;
      if (/safepal/i.test(`${ info?.name ?? '' } ${ info?.rdns ?? '' }`)) {
        stop();
      }
    };
    const pollId = setInterval(() => {
      tries += 1;
      check();
      if (!done && tries >= LATE_INJECTION_MAX_TRIES) {
        stop();
      }
    }, LATE_INJECTION_POLL_MS);
    win.addEventListener('ethereum#initialized', check);
    win.addEventListener('eip6963:announceProvider', onSelfAnnounce);
  } catch {}
}
