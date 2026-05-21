import { useCallback, useMemo } from 'react';

import useAddressMetadataInfoQuery from './useAddressMetadataInfoQuery';

export default function useAddressesMetadata(addresses: Array<string>) {
  const dedupedLowercase = useMemo(
    () => Array.from(new Set(addresses.map((a) => a.toLowerCase()))),
    [ addresses ],
  );

  const query = useAddressMetadataInfoQuery(dedupedLowercase);

  const getMetadata = useCallback(
    (hash: string) => query.data?.addresses[hash.toLowerCase()],
    [ query.data ],
  );

  return {
    getMetadata,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
