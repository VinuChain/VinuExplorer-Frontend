import { Box, type BadgeProps } from '@chakra-ui/react';
import React from 'react';

import type { PublicTagApplicationStatus } from 'types/api/publicTagSubmissions';

import { Badge } from 'toolkit/chakra/badge';
import { Tooltip } from 'toolkit/chakra/tooltip';

const STATUS_VARIANTS: Record<PublicTagApplicationStatus, { colorPalette: BadgeProps['colorPalette']; label: string }> = {
  pending: { colorPalette: 'orange', label: 'Pending review' },
  processing: { colorPalette: 'blue', label: 'Applying' },
  approved: { colorPalette: 'green', label: 'Approved' },
  rejected: { colorPalette: 'red', label: 'Rejected' },
};

interface Props {
  status: PublicTagApplicationStatus;
  reason?: string | null;
}

const PublicTagApplicationStatusBadge = ({ status, reason }: Props) => {
  const { colorPalette, label } = STATUS_VARIANTS[status];
  const badge = <Badge colorPalette={ colorPalette }>{ label }</Badge>;

  if (status === 'rejected' && reason) {
    return (
      <Tooltip content={ reason }>
        <Box
          as="span"
          tabIndex={ 0 }
          aria-label={ `Rejected: ${ reason }` }
          display="inline-block"
          _focusVisible={{ outline: '2px solid', outlineColor: 'focus', outlineOffset: '2px' }}
        >
          { badge }
        </Box>
      </Tooltip>
    );
  }

  if (status === 'processing') {
    return (
      <Tooltip content="This approved request is being applied. It cannot be edited while processing.">
        <Box
          as="span"
          tabIndex={ 0 }
          aria-label="Applying: approved changes are being applied"
          display="inline-block"
          _focusVisible={{ outline: '2px solid', outlineColor: 'focus', outlineOffset: '2px' }}
        >
          { badge }
        </Box>
      </Tooltip>
    );
  }

  return badge;
};

export default React.memo(PublicTagApplicationStatusBadge);
