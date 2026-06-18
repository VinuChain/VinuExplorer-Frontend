import BigNumber from 'bignumber.js';
import React from 'react';

import type { Transaction } from 'types/api/transaction';

import type { BadgeProps } from 'toolkit/chakra/badge';
import { Badge } from 'toolkit/chakra/badge';
import { Tooltip } from 'toolkit/chakra/tooltip';
import IconSvg from 'ui/shared/IconSvg';

export interface Props extends BadgeProps {
  tx: Pick<Transaction, 'fee_refund' | 'fee'>;
  isLoading?: boolean;
  compact?: boolean;
}

const TxFeeRefundBadge = ({ tx, isLoading, compact, ...rest }: Props) => {
  const refund = BigNumber(tx.fee_refund || 0);

  if (!refund.gt(0)) {
    return null;
  }

  const grossFee = BigNumber(tx.fee?.value || 0);
  const isFullyFeeless = refund.gte(grossFee);

  const label = isFullyFeeless ? 'Gas-Free' : 'Quota-Subsidized';
  // Shorter label for the space-constrained txs-table fee cell.
  const compactLabel = isFullyFeeless ? 'Free' : 'Subsidized';
  const hint = isFullyFeeless ?
    'The full transaction fee was refunded from the sender\'s Payback quota' :
    'Part of the transaction fee was refunded from the sender\'s Payback quota';
  const colorPalette: BadgeProps['colorPalette'] = isFullyFeeless ? 'green' : 'teal';

  const icon = (
    <IconSvg
      name="gas"
      boxSize={ compact ? 2.5 : 3 }
      display="inline-block"
    />
  );

  return (
    <Tooltip content={ hint } disabled={ isLoading }>
      <Badge
        colorPalette={ colorPalette }
        loading={ isLoading }
        startElement={ icon }
        { ...rest }
      >
        { compact ? compactLabel : label }
      </Badge>
    </Tooltip>
  );
};

export default React.memo(TxFeeRefundBadge);
