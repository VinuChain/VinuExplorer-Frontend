// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { PaginationParams } from 'ui/shared/pagination/types';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Transactions from './Transactions';

const {
  mockUseIsMobile,
  mockUseQueryWithPages,
  mockUseRouter,
  resetBlobTxs,
  resetPending,
  resetValidated,
  resetWatchlist,
} = vi.hoisted(() => ({
  mockUseIsMobile: vi.fn(),
  mockUseQueryWithPages: vi.fn(),
  mockUseRouter: vi.fn(),
  resetBlobTxs: vi.fn(),
  resetPending: vi.fn(),
  resetValidated: vi.fn(),
  resetWatchlist: vi.fn(),
}));

vi.mock('@chakra-ui/react', () => ({
  [String('Flex')]: ({ children }: { children: React.ReactNode }) => <div>{ children }</div>,
}));

vi.mock('next/router', () => ({
  useRouter: mockUseRouter,
}));

vi.mock('lib/hooks/useIsMobile', () => ({
  'default': mockUseIsMobile,
}));

vi.mock('ui/shared/pagination/useQueryWithPages', () => ({
  'default': mockUseQueryWithPages,
}));

vi.mock('ui/snippets/auth/useIsAuth', () => ({
  'default': () => true,
}));

vi.mock('toolkit/components/RoutedTabs/RoutedTabs', () => ({
  'default': ({ rightSlot }: { rightSlot?: React.ReactNode }) => <div>{ rightSlot }</div>,
}));

vi.mock('ui/shared/Page/PageTitle', () => ({
  'default': () => null,
}));

vi.mock('ui/txs/TxsStats', () => ({
  'default': () => null,
}));

vi.mock('ui/txs/TxsWatchlist', () => ({
  'default': () => null,
}));

vi.mock('ui/txs/TxsWithFrontendSorting', () => ({
  'default': () => null,
}));

vi.mock('ui/shared/links/AdvancedFilterLink', () => ({
  'default': () => null,
}));

vi.mock('ui/shared/pagination/Pagination', () => ({
  'default': () => null,
}));

vi.mock('ui/txs/TxsRefreshButton', () => ({
  'default': ({ onClick, isLoading }: { onClick: () => void; isLoading?: boolean }) => (
    <button type="button" aria-label="Refresh transactions" disabled={ isLoading } onClick={ onClick }/>
  ),
}));

function getPagination(resetPage: () => void): PaginationParams {
  return {
    page: 1,
    onNextPageClick: vi.fn(),
    onPrevPageClick: vi.fn(),
    resetPage,
    hasPages: false,
    hasNextPage: false,
    canGoBackwards: false,
    isLoading: false,
    isVisible: true,
  };
}

function getQuery(resetPage: () => void) {
  return {
    pagination: getPagination(resetPage),
  };
}

describe('Transactions refresh button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobile.mockReturnValue(false);
    mockUseRouter.mockReturnValue({ query: {} });
    mockUseQueryWithPages.mockImplementation(({ resourceName }: { resourceName: string }) => {
      switch (resourceName) {
        case 'general:txs_pending':
          return getQuery(resetPending);
        case 'general:txs_with_blobs':
          return getQuery(resetBlobTxs);
        case 'general:txs_watchlist':
          return getQuery(resetWatchlist);
        default:
          return getQuery(resetValidated);
      }
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('refreshes the validated transactions tab by default', () => {
    render(<Transactions/>);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh transactions' }));

    expect(resetValidated).toHaveBeenCalledTimes(1);
    expect(resetPending).not.toHaveBeenCalled();
    expect(resetWatchlist).not.toHaveBeenCalled();
  });

  it('refreshes the active transaction tab', () => {
    mockUseRouter.mockReturnValue({ query: { tab: 'pending' } });

    render(<Transactions/>);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh transactions' }));

    expect(resetPending).toHaveBeenCalledTimes(1);
    expect(resetValidated).not.toHaveBeenCalled();
  });
});
