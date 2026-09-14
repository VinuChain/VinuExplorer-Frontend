// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { afterEach, describe, expect, it, vi } from 'vitest';

import UserProfileDesktop from './UserProfileDesktop';
import UserProfileMobile from './UserProfileMobile';

const state = vi.hoisted(() => ({
  isWalletEnabled: true,
  authUrl: '/auth/auth0' as string | undefined,
  redirect: vi.fn(),
}));

vi.mock('configs/app', () => ({
  'default': {
    features: {
      blockchainInteraction: {
        get isEnabled() {
          return state.isWalletEnabled;
        },
      },
    },
  },
}));

vi.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/', asPath: '/' }),
}));

vi.mock('lib/mixpanel', () => ({
  logEvent: vi.fn(),
  EventTypes: { ACCOUNT_ACCESS: 'Account access' },
}));

vi.mock('lib/web3/useAccount', () => ({
  'default': () => ({ address: undefined }),
}));

vi.mock('ui/snippets/auth/useProfileQuery', () => ({
  'default': () => ({ data: undefined }),
}));

vi.mock('ui/snippets/auth/redirectToAuthProvider', () => ({
  getAuthProviderUrl: () => state.authUrl,
  redirectToAuthProvider: (path?: string) => {
    state.redirect(path);
    return Boolean(state.authUrl);
  },
}));

vi.mock('ui/snippets/auth/AuthModal', () => ({
  'default': () => <div>auth modal</div>,
}));

vi.mock('./UserProfileButton', () => ({
  'default': ({ onClick }: { onClick: () => void }) => <button type="button" onClick={ onClick }>Log in</button>,
}));

vi.mock('./UserProfileContent', () => ({
  'default': () => <div>profile menu</div>,
}));

const [ Root, Pass ] = vi.hoisted(() => [
  ({ open, children }: { open: boolean; children?: React.ReactNode }) => (
    <div data-testid="menu-root" data-open={ String(open) }>{ children }</div>
  ),
  ({ children }: { children?: React.ReactNode }) => <div>{ children }</div>,
] as const);

vi.mock('toolkit/chakra/popover', () => ({
  PopoverRoot: Root,
  PopoverTrigger: Pass,
  PopoverContent: Pass,
  PopoverBody: Pass,
}));

vi.mock('toolkit/chakra/drawer', () => ({
  DrawerRoot: Root,
  DrawerTrigger: Pass,
  DrawerContent: Pass,
  DrawerBody: Pass,
}));

afterEach(() => {
  cleanup();
  state.isWalletEnabled = true;
  state.authUrl = '/auth/auth0';
  state.redirect.mockClear();
});

describe.each([
  [ 'UserProfileDesktop', UserProfileDesktop ],
  [ 'UserProfileMobile', UserProfileMobile ],
])('%s header button without a profile or a connected wallet', (_, Component) => {
  it('opens the menu with the wallet connect instead of redirecting to external auth', () => {
    // After a wallet disconnect the external auth redirect used to be the only
    // thing the button did, so there was no way back to a wallet connect.
    render(<Component/>);
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(state.redirect).not.toHaveBeenCalled();
    expect(screen.getByTestId('menu-root').getAttribute('data-open')).toBe('true');
    expect(screen.getByText('profile menu')).toBeTruthy();
  });

  it('still redirects to external auth when the deployment has no wallet support', () => {
    state.isWalletEnabled = false;

    render(<Component/>);
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(state.redirect).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('menu-root').getAttribute('data-open')).toBe('false');
  });

  it('still opens the auth modal when the deployment has no external auth', () => {
    state.authUrl = undefined;

    render(<Component/>);
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByTestId('menu-root').getAttribute('data-open')).toBe('false');
    expect(screen.getByText('auth modal')).toBeTruthy();
  });
});
