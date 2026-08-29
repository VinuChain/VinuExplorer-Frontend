// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import React from 'react';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NameDomain from './NameDomain';

const { mockUseApiQuery, mockUseRouter } = vi.hoisted(() => ({
  mockUseApiQuery: vi.fn(),
  mockUseRouter: vi.fn(),
}));

vi.mock('next/router', () => ({
  useRouter: mockUseRouter,
}));

vi.mock('lib/api/useApiQuery', () => ({
  'default': mockUseApiQuery,
}));

vi.mock('ui/nameDomain/NameDomainDetails', () => ({
  'default': () => null,
}));

vi.mock('ui/nameDomain/NameDomainHistory', () => ({
  'default': () => null,
}));

vi.mock('ui/shared/ad/TextAd', () => ({
  'default': () => null,
}));

vi.mock('ui/shared/Page/PageTitle', () => ({
  'default': () => null,
}));

vi.mock('toolkit/components/RoutedTabs/RoutedTabs', () => ({
  'default': () => null,
}));

describe('NameDomain page route param handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApiQuery.mockReturnValue({ data: undefined, isError: false, error: null, isPlaceholderData: true });
  });

  afterEach(() => {
    cleanup();
  });

  it('throws a 404 for a decodable but invalid name instead of a permanent skeleton', () => {
    mockUseRouter.mockReturnValue({
      query: { name: 'bad%20name' },
      isReady: true,
    });

    let thrown: unknown;
    try {
      render(<NameDomain/>);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe('Domain not found');
    expect((thrown as Error).cause).toEqual({ status: 404 });
    expect(mockUseApiQuery).toHaveBeenCalledWith('bens:domain_info', expect.objectContaining({
      queryOptions: expect.objectContaining({ enabled: false }),
    }));
  });

  it('renders and enables the query for a valid name', () => {
    mockUseRouter.mockReturnValue({
      query: { name: 'alice.vc' },
      isReady: true,
    });

    expect(() => render(<NameDomain/>)).not.toThrow();
    expect(mockUseApiQuery).toHaveBeenCalledWith('bens:domain_info', expect.objectContaining({
      pathParams: expect.objectContaining({ name: 'alice.vc' }),
      queryOptions: expect.objectContaining({ enabled: true }),
    }));
  });
});
