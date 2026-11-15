import { Box, Text } from '@chakra-ui/react';
import React from 'react';

import { type AdvancedFilterParams } from 'types/api/advancedFilter';

import { Radio, RadioGroup } from 'toolkit/chakra/radio';

const FILTER_PARAM = 'address_relation';

type Value = 'or' | 'and';

const DEFAULT_VALUE = 'or' as Value;

type Props = {
  value?: Value;
  handleFilterChange: (filed: keyof AdvancedFilterParams, value?: string) => void;
  columnName: string;
  isLoading?: boolean;
  onClose?: () => void;
};

const AddressRelationFilter = ({ value = DEFAULT_VALUE, handleFilterChange, onClose }: Props) => {
  const onFilter = React.useCallback(({ value }: { value: string | null }) => {
    if (!value) {
      return;
    }

    onClose && onClose();
    handleFilterChange(FILTER_PARAM, value as Value);
  }, [ handleFilterChange, onClose ]);

  return (
    <Box w="100%">
      <RadioGroup onValueChange={ onFilter } value={ value } orientation="vertical">
        <Radio value="and">
          <Box>
            <Text>AND</Text>
            <Text fontSize="xs" color="text.secondary" whiteSpace="normal">Transactions that match both the From and the To addresses</Text>
          </Box>
        </Radio>
        <Radio value="or">
          <Box>
            <Text>OR</Text>
            <Text fontSize="xs" color="text.secondary" whiteSpace="normal">Transactions that match at least one of the From or To addresses</Text>
          </Box>
        </Radio>
      </RadioGroup>
    </Box>
  );
};

export default AddressRelationFilter;
