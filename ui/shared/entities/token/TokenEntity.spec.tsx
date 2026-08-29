// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react';
import React from 'react';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { Icon } from './TokenEntity';

vi.mock('ui/shared/entities/base/components', () => ({
  [String('Container')]: () => null,
  [String('Link')]: () => null,
  [String('Content')]: () => null,
  [String('Copy')]: () => null,
  [String('Icon')]: ({ src, alt, onError }: { src?: string; alt?: string; onError?: () => void }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={ src } alt={ alt } onError={ onError }/>
  ),
}));

const ADDRESS = '0xF56b7693E4212C584de4a83117f805B8E89224CB';
const LIST_URL = `https://raw.githubusercontent.com/VinuChain/vinuchain-lists/main/tokens/${ ADDRESS }/${ ADDRESS }.png`;

const token = {
  address_hash: ADDRESS,
  icon_url: null as string | null,
  name: 'Duck',
  symbol: 'DUCK',
  type: 'ERC-20' as const,
  reputation: null,
};

const renderIcon = (overrides: Partial<typeof token> = {}) => {
  const { container } = render(<Icon token={{ ...token, ...overrides }}/>);
  return container.querySelector('img') as HTMLImageElement;
};

describe('TokenEntity icon source', () => {
  afterEach(() => {
    cleanup();
  });

  it('prefers the backend icon_url', () => {
    expect(renderIcon({ icon_url: 'https://example.com/logo.png' }).getAttribute('src')).toBe('https://example.com/logo.png');
  });

  it('falls back to vinuchain-lists once, then negative-caches the 404 for later mounts', () => {
    const first = renderIcon();
    expect(first.getAttribute('src')).toBe(LIST_URL);

    fireEvent.error(first);
    cleanup();

    expect(renderIcon().getAttribute('src')).toBeNull();
  });

  it('retries after the negative cache expires, so a transient failure is not permanent', () => {
    // A distinct token: the negative cache is module-scoped, so reusing the
    // address above would start this test already poisoned.
    const address = '0x1111111111111111111111111111111111111111';
    const listUrl = `https://raw.githubusercontent.com/VinuChain/vinuchain-lists/main/tokens/${ address }/${ address }.png`;
    const renderIcon = (overrides: Partial<typeof token> = {}) => {
      const { container } = render(<Icon token={{ ...token, address_hash: address, ...overrides }}/>);
      return container.querySelector('img') as HTMLImageElement;
    };

    const first = renderIcon();
    expect(first.getAttribute('src')).toBe(listUrl);

    // An <img> error carries no status, so this could equally have been a
    // network blip as a 404.
    fireEvent.error(first);
    cleanup();
    expect(renderIcon().getAttribute('src')).toBeNull();
    cleanup();

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 6 * 60 * 1000);
    expect(renderIcon().getAttribute('src')).toBe(listUrl);
    vi.restoreAllMocks();
  });
});
