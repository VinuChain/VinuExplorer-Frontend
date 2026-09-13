import { describe, expect, it } from 'vitest';

import announceSafePal, { findSafePalProvider } from './announceSafePal';

const provider = (flags: Record<string, unknown> = {}) => ({ ...flags, request: async() => null });

const fakeWindow = (props: Record<string, unknown>) => Object.assign(new EventTarget(), props);

type Announcement = { info: { name: string; rdns: string }; provider: unknown };

function announcementsAfterRequest(win: EventTarget) {
  const seen: Array<Announcement> = [];
  win.addEventListener('eip6963:announceProvider', (e) => seen.push((e as CustomEvent<Announcement>).detail));
  win.dispatchEvent(new Event('eip6963:requestProvider'));
  return seen;
}

describe('findSafePalProvider', () => {
  // Each shape was reproduced on production as a modal with no SafePal row.
  it('finds SafePal on its own namespace with window.ethereum absent', () => {
    const sp = provider({ isSafePal: true });
    expect(findSafePalProvider({ safepalProvider: sp })).toBe(sp);
  });

  it('finds the namespace provider, not MetaMask, when MetaMask owns window.ethereum', () => {
    const sp = provider({ isSafePal: true });
    expect(findSafePalProvider({ ethereum: provider({ isMetaMask: true }), safepalProvider: sp })).toBe(sp);
  });

  it('finds SafePal inside a multi-extension providers array', () => {
    const sp = provider({ isSafePal: true });
    expect(findSafePalProvider({ ethereum: { providers: [ provider({ isMetaMask: true }), sp ] } })).toBe(sp);
  });

  it('falls back to a flagged root when the providers array lacks SafePal', () => {
    const root = { ...provider({ isSafePal: true }), providers: [ provider({ isMetaMask: true }) ] };
    expect(findSafePalProvider({ ethereum: root })).toBe(root);
  });

  it('returns null when SafePal is not on the page', () => {
    expect(findSafePalProvider({})).toBeNull();
    expect(findSafePalProvider({ ethereum: provider({ isMetaMask: true }) })).toBeNull();
  });
});

describe('announceSafePal', () => {
  it('announces a namespace-only SafePal with that exact provider', () => {
    const sp = provider({ isSafePal: true });
    const win = fakeWindow({ safepalProvider: sp });
    announceSafePal(win);
    const seen = announcementsAfterRequest(win);
    expect(seen).toHaveLength(1);
    expect(seen[0].provider).toBe(sp);
    expect(seen[0].info.rdns).toBe('com.safepal');
  });

  it('keeps answering later requests, as AppKit requests after init', () => {
    const win = fakeWindow({ safepalProvider: provider({ isSafePal: true }) });
    announceSafePal(win);
    expect(announcementsAfterRequest(win)).toHaveLength(1);
    expect(announcementsAfterRequest(win)).toHaveLength(1);
  });

  it('stays silent when SafePal already announces itself', () => {
    // A second announcement would render two SafePal rows.
    const sp = provider({ isSafePal: true });
    const win = fakeWindow({ safepalProvider: sp });
    win.addEventListener('eip6963:requestProvider', () => win.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', { detail: { info: { name: 'SafePal Wallet', rdns: 'io.safepal.wallet' }, provider: sp } }),
    ));
    announceSafePal(win);
    expect(announcementsAfterRequest(win).filter((d) => d.info.rdns === 'com.safepal')).toHaveLength(0);
  });

  it('does nothing when SafePal is absent, and without a window', () => {
    const win = fakeWindow({ ethereum: provider({ isMetaMask: true }) });
    announceSafePal(win);
    expect(announcementsAfterRequest(win)).toHaveLength(0);
    expect(() => announceSafePal(undefined)).not.toThrow();
  });
});
