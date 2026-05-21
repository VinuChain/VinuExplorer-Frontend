// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from 'vitest/lib';

import useAddressesMetadata from './useAddressesMetadata';

const { mockUseAddressMetadataInfoQuery } = vi.hoisted(() => ({
  mockUseAddressMetadataInfoQuery: vi.fn(),
}));

vi.mock('./useAddressMetadataInfoQuery', () => ({
  'default': mockUseAddressMetadataInfoQuery,
}));

describe('useAddressesMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns undefined for an unknown hash', () => {
    mockUseAddressMetadataInfoQuery.mockReturnValue({
      data: { addresses: {} },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useAddressesMetadata([ '0xAbC' ]));
    expect(result.current.getMetadata('0xabc')).toBeUndefined();
  });

  it('returns metadata for a known hash, lowercasing the lookup key', () => {
    mockUseAddressMetadataInfoQuery.mockReturnValue({
      data: {
        addresses: {
          '0xabc': {
            tags: [ { name: 'Exchange', tagType: 'protocol' } ],
            reputation: null,
          },
        },
      },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useAddressesMetadata([ '0xABC' ]));
    const metadata = result.current.getMetadata('0xABC');
    expect(metadata?.tags[0].name).toBe('Exchange');
  });

  it('dedupes and lowercases addresses before passing to the underlying query', () => {
    mockUseAddressMetadataInfoQuery.mockReturnValue({
      data: { addresses: {} },
      isLoading: false,
      isError: false,
    });

    renderHook(() => useAddressesMetadata([ '0xABC', '0xabc', '0xDeF' ]));
    expect(mockUseAddressMetadataInfoQuery).toHaveBeenCalledWith([ '0xabc', '0xdef' ]);
  });

  it('propagates isLoading and isError from the underlying query', () => {
    mockUseAddressMetadataInfoQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    const { result } = renderHook(() => useAddressesMetadata([ '0xAbC' ]));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
  });
});
