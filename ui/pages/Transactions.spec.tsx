// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { PaginationParams } from 'ui/shared/pagination/types';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Transactions from './Transactions';

const {
  mockReload,
  mockUseIsMobile,
  mockUseQueryWithPages,
  mockUseRouter,
} = vi.hoisted(() => ({
  mockReload: vi.fn(),
  mockUseIsMobile: vi.fn(),
  mockUseQueryWithPages: vi.fn(),
  mockUseRouter: vi.fn(),
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

function getPagination(): PaginationParams {
  return {
    page: 1,
    onNextPageClick: vi.fn(),
    onPrevPageClick: vi.fn(),
    resetPage: vi.fn(),
    hasPages: false,
    hasNextPage: false,
    canGoBackwards: false,
    isLoading: false,
    isVisible: true,
  };
}

function getQuery() {
  return {
    pagination: getPagination(),
  };
}

describe('Transactions refresh button', () => {
  // `window.location.reload` is non-configurable in jsdom; replace the
  // entire `location` with a stub object so we can assert `reload` is NOT
  // called without `Object.defineProperty` complaining about it being read-only.
  const originalLocation = window.location;
  let validatedQuery: ReturnType<typeof getQuery>;
  let pendingQuery: ReturnType<typeof getQuery>;

  beforeEach(() => {
    vi.clearAllMocks();
    validatedQuery = getQuery();
    pendingQuery = getQuery();
    mockUseIsMobile.mockReturnValue(false);
    mockUseRouter.mockReturnValue({ query: {} });
    mockUseQueryWithPages.mockImplementation(({ resourceName }: { resourceName: string }) => (
      resourceName === 'general:txs_pending' ? pendingQuery : validatedQuery
    ));

    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, reload: mockReload },
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it('soft-refetches the default validated tab via pagination.resetPage', () => {
    render(<Transactions/>);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh transactions' }));

    expect(validatedQuery.pagination.resetPage).toHaveBeenCalledTimes(1);
    expect(pendingQuery.pagination.resetPage).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('soft-refetches the pending tab via pagination.resetPage', () => {
    mockUseRouter.mockReturnValue({ query: { tab: 'pending' } });

    render(<Transactions/>);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh transactions' }));

    expect(pendingQuery.pagination.resetPage).toHaveBeenCalledTimes(1);
    expect(validatedQuery.pagination.resetPage).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });
});
