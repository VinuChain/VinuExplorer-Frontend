// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { PaginationParams } from 'ui/shared/pagination/types';

import { describe, expect, it, vi } from 'vitest';

import TxsHeaderMobile from './TxsHeaderMobile';

vi.mock('@chakra-ui/react', () => ({
  [String('HStack')]: ({ children }: { children: React.ReactNode }) => <div>{ children }</div>,
  chakra: (Component: React.ComponentType<Record<string, unknown>>) => Component,
  createListCollection: ({ items }: { items: Array<unknown> }) => ({ items }),
}));

vi.mock('ui/shared/ActionBar', () => ({
  'default': ({ children }: { children: React.ReactNode }) => <div>{ children }</div>,
}));

vi.mock('ui/shared/pagination/Pagination', () => ({
  'default': () => null,
}));

vi.mock('ui/shared/sort/Sort', () => ({
  'default': () => null,
}));

vi.mock('./TxsRefreshButton', () => ({
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

describe('TxsHeaderMobile', () => {
  it('wires the refresh button to a full page reload (not pagination.resetPage)', () => {
    // Soft refetch via resetPage leaves SocketNewItemsNotice broken (banner
    // vanishes and never reappears). The refresh button must do a hard
    // reload instead so the socket hook re-mounts cleanly.
    const reload = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, reload },
      writable: true,
      configurable: true,
    });

    const resetPage = vi.fn();

    render(
      <TxsHeaderMobile
        sorting="default"
        paginationProps={ getPagination(resetPage) }
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh transactions' }));

    expect(reload).toHaveBeenCalledTimes(1);
    expect(resetPage).not.toHaveBeenCalled();

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });
});
