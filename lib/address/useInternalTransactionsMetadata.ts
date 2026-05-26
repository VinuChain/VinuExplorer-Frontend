import { useMemo } from 'react';

import type { InternalTransaction } from 'types/api/internalTransaction';

import useAddressesMetadata from './useAddressesMetadata';

export default function useInternalTransactionsMetadata(items: Array<InternalTransaction> | undefined) {
  const hashesForMetadata = useMemo(
    () => (items ?? [])
      .flatMap((item) => [ item.from?.hash, item.to?.hash, item.created_contract?.hash ])
      .filter((hash): hash is string => Boolean(hash)),
    [ items ],
  );
  const { getMetadata } = useAddressesMetadata(hashesForMetadata);

  return useMemo(() => {
    if (!items) {
      return items;
    }

    return items.map((item): InternalTransaction => {
      const base = {
        ...item,
        from: { ...item.from, metadata: getMetadata(item.from.hash) ?? item.from.metadata },
      };

      if (item.to) {
        return {
          ...base,
          to: { ...item.to, metadata: getMetadata(item.to.hash) ?? item.to.metadata },
          created_contract: null,
        };
      }

      return {
        ...base,
        to: null,
        created_contract: {
          ...item.created_contract,
          metadata: getMetadata(item.created_contract.hash) ?? item.created_contract.metadata,
        },
      };
    });
  }, [ items, getMetadata ]);
}
