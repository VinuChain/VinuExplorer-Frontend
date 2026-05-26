import { useMemo } from 'react';

import type { TokenTransfer } from 'types/api/tokenTransfer';

import useAddressesMetadata from './useAddressesMetadata';

export default function useTokenTransfersMetadata(items: Array<TokenTransfer> | undefined) {
  const hashesForMetadata = useMemo(
    () => (items ?? [])
      .flatMap((item) => [ item.from?.hash, item.to?.hash ])
      .filter((hash): hash is string => Boolean(hash)),
    [ items ],
  );
  const { getMetadata } = useAddressesMetadata(hashesForMetadata);

  return useMemo(() => {
    if (!items) {
      return items;
    }

    return items.map((item) => ({
      ...item,
      from: item.from && { ...item.from, metadata: getMetadata(item.from.hash) ?? item.from.metadata },
      to: item.to && { ...item.to, metadata: getMetadata(item.to.hash) ?? item.to.metadata },
    }));
  }, [ items, getMetadata ]);
}
