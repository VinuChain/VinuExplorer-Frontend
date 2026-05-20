// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import React from 'react';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Cluster from './Cluster';

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

vi.mock('ui/cluster/ClusterDetails', () => ({
  'default': () => null,
}));

vi.mock('ui/shared/ad/TextAd', () => ({
  'default': () => null,
}));

vi.mock('ui/shared/Page/PageTitle', () => ({
  'default': () => null,
}));

describe('Cluster page route param handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApiQuery.mockReturnValue({ data: undefined, isLoading: false });
  });

  afterEach(() => {
    cleanup();
  });

  it('decodes an encoded cluster name before querying', () => {
    mockUseRouter.mockReturnValue({
      query: { name: 'parent%2Fchild' },
      isReady: true,
    });

    render(<Cluster/>);

    expect(mockUseApiQuery).toHaveBeenCalledWith('clusters:get_cluster_by_name', {
      queryParams: {
        input: JSON.stringify({ name: 'parent/child' }),
      },
      queryOptions: {
        enabled: true,
      },
    });
  });

  it('does not throw or enable the query for malformed percent encoding', () => {
    mockUseRouter.mockReturnValue({
      query: { name: '%E0%A4%A' },
      isReady: true,
    });

    expect(() => render(<Cluster/>)).not.toThrow();
    expect(mockUseApiQuery).toHaveBeenCalledWith('clusters:get_cluster_by_name', {
      queryParams: {
        input: JSON.stringify({ name: '' }),
      },
      queryOptions: {
        enabled: false,
      },
    });
  });

  it('does not enable the query for syntactically invalid cluster names', () => {
    mockUseRouter.mockReturnValue({
      query: { name: 'parent%3Fchild' },
      isReady: true,
    });

    render(<Cluster/>);

    expect(mockUseApiQuery).toHaveBeenCalledWith('clusters:get_cluster_by_name', {
      queryParams: {
        input: JSON.stringify({ name: '' }),
      },
      queryOptions: {
        enabled: false,
      },
    });
  });
});
