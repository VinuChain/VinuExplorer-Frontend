// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from 'vitest/lib';

import useApiFetch from './useApiFetch';
import { getResourceKey } from './useApiQuery';

const responseInit = {
  headers: {
    'Content-Type': 'application/json',
  },
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={ queryClient }>{ children }</QueryClientProvider>;
  };
}

describe('useApiFetch()', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    document.cookie = '_explorer_key=api-token; path=/';
  });

  it('uses session credentials and csrf for public tag admin mutations', async() => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(getResourceKey('general:csrf'), { token: 'csrf-token' });
    fetchMock.mockResponse(JSON.stringify({ id: 42 }), responseInit);

    const { result } = renderHook(() => useApiFetch(), { wrapper: createWrapper(queryClient) });

    await act(async() => {
      await result.current('admin:public_tag_application_update', {
        pathParams: { chainId: '1', id: '42' },
        fetchParams: {
          method: 'PUT',
          body: { submission: { name: 'Updated tag' } },
        },
      });
    });

    const [ , init ] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;

    expect(init?.credentials).toBe('same-origin');
    expect(headers['x-csrf-token']).toBe('csrf-token');
    expect(headers.Authorization).toBe('api-token');
  });

  it('keeps regular admin resources credentialless', async() => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(getResourceKey('general:csrf'), { token: 'csrf-token' });
    fetchMock.mockResponse(JSON.stringify({}), responseInit);

    const { result } = renderHook(() => useApiFetch(), { wrapper: createWrapper(queryClient) });

    await act(async() => {
      await result.current('admin:token_info_applications_config', {
        pathParams: { chainId: '1' },
      });
    });

    const [ , init ] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;

    expect(init?.credentials).toBe('omit');
    expect(headers['x-csrf-token']).toBeUndefined();
    expect(headers.Authorization).toBe('api-token');
  });
});
