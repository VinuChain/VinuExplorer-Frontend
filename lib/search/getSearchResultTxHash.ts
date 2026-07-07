type SearchResultTxLike = {
  transaction_hash?: string | null;
  tx_hash?: string | null;
};

export default function getSearchResultTxHash(tx: SearchResultTxLike) {
  return tx.transaction_hash || tx.tx_hash || '';
}
