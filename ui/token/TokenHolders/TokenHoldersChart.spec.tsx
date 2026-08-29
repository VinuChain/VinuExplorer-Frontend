// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TokenHoldersChart from './TokenHoldersChart';

const { mockUseApiQuery } = vi.hoisted(() => ({
  mockUseApiQuery: vi.fn(),
}));

vi.mock('lib/api/useApiQuery', () => ({
  'default': mockUseApiQuery,
}));

vi.mock('@chakra-ui/react', () => ({
  [String('Box')]: ({ children }: { children?: React.ReactNode }) => <div>{ children }</div>,
  [String('Flex')]: ({ children }: { children?: React.ReactNode }) => <div>{ children }</div>,
  [String('Text')]: ({ children }: { children?: React.ReactNode }) => <p>{ children }</p>,
}));

vi.mock('toolkit/chakra/button', () => ({
  [String('Button')]: ({ children }: { children?: React.ReactNode }) => <button>{ children }</button>,
}));

vi.mock('toolkit/chakra/skeleton', () => ({
  [String('Skeleton')]: ({ loading }: { loading?: boolean }) => <div data-testid="skeleton" data-loading={ loading }/>,
}));

vi.mock('ui/shared/DataFetchAlert', () => ({
  'default': () => <div role="alert">Something went wrong</div>,
}));

const idle = { data: undefined, isError: false, error: null, isLoading: false };

describe('TokenHoldersChart states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('reports a non-404 error as an error, not as "being computed"', () => {
    mockUseApiQuery.mockReturnValue({ ...idle, isError: true, error: { status: 500 } });

    render(<TokenHoldersChart hash="0x1" period="30d" onChangePeriod={ vi.fn() }/>);

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByText(/being computed/)).toBeNull();
  });

  it('shows the "being computed" copy only for a 404', () => {
    mockUseApiQuery.mockReturnValue({ ...idle, isError: true, error: { status: 404 } });

    render(<TokenHoldersChart hash="0x1" period="30d" onChangePeriod={ vi.fn() }/>);

    expect(screen.getByText(/being computed/)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders a skeleton instead of "Loading..." text while pending', () => {
    mockUseApiQuery.mockReturnValue({ ...idle, isLoading: true });

    render(<TokenHoldersChart hash="0x1" period="30d" onChangePeriod={ vi.fn() }/>);

    expect(screen.getByTestId('skeleton').getAttribute('data-loading')).toBe('true');
    expect(screen.queryByText('Loading...')).toBeNull();
  });
});
