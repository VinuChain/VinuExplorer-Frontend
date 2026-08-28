import { HStack } from '@chakra-ui/react';
import React from 'react';

import type { PublicTagApplicationStatus } from 'types/api/publicTagSubmissions';

import { Button } from 'toolkit/chakra/button';

interface Props {
  value?: PublicTagApplicationStatus;
  onChange: (value: PublicTagApplicationStatus | undefined) => void;
}

const STATUSES: Array<{ label: string; value: PublicTagApplicationStatus }> = [
  { label: 'Pending', value: 'pending' },
  { label: 'Applying', value: 'processing' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

interface StatusButtonProps {
  status: { label: string; value: PublicTagApplicationStatus };
  activeValue?: PublicTagApplicationStatus;
  onChange: (value: PublicTagApplicationStatus | undefined) => void;
}

const StatusButton = ({ status, activeValue, onChange }: StatusButtonProps) => {
  const handleClick = React.useCallback(() => onChange(status.value), [ onChange, status.value ]);
  return (
    <Button
      size="sm"
      variant={ activeValue === status.value ? 'solid' : 'outline' }
      onClick={ handleClick }
      aria-pressed={ activeValue === status.value }
    >
      { status.label }
    </Button>
  );
};

const PublicTagApplicationsStatusFilter = ({ value, onChange }: Props) => {
  const handleAll = React.useCallback(() => onChange(undefined), [ onChange ]);

  return (
    <HStack gap={ 2 } flexWrap="wrap">
      <Button
        size="sm"
        variant={ value === undefined ? 'solid' : 'outline' }
        onClick={ handleAll }
        aria-pressed={ value === undefined }
      >
        All
      </Button>
      { STATUSES.map((s) => (
        <StatusButton key={ s.value } status={ s } activeValue={ value } onChange={ onChange }/>
      )) }
    </HStack>
  );
};

export default React.memo(PublicTagApplicationsStatusFilter);
