import { Grid, GridItem, Text } from '@chakra-ui/react';
import React from 'react';

import type { FormFields } from '../types';

import { FormFieldColor } from 'toolkit/components/forms/fields/FormFieldColor';
import { FormFieldText } from 'toolkit/components/forms/fields/FormFieldText';
import { FormFieldUrl } from 'toolkit/components/forms/fields/FormFieldUrl';

import PublicTagsSubmitFieldTagIcon from './PublicTagsSubmitFieldTagIcon';

const CIRCLE_BG_COLOR_DEFAULT = {
  bgColor: { _light: 'gray.100', _dark: 'gray.700' },
  textColor: { _light: 'blackAlpha.800', _dark: 'whiteAlpha.800' },
};

const PublicTagsUpdateFields = () => {
  return (
    <GridItem colSpan={{ base: 1, lg: 3 }}>
      <Text color="text.secondary" fontSize="sm" mb={ 3 }>
        Enter only the details you want changed. Blank fields keep their current values.
      </Text>
      <Grid
        rowGap={ 3 }
        columnGap={ 3 }
        templateColumns={{ base: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }}
      >
        <FormFieldUrl<FormFields>
          name="tags.0.url"
          placeholder="Tag URL"
        />
        <PublicTagsSubmitFieldTagIcon index={ 0 }/>
        <FormFieldColor<FormFields>
          name="tags.0.bgColor"
          placeholder="Background (Hex)"
          sampleDefaultBgColor={ CIRCLE_BG_COLOR_DEFAULT.bgColor }
        />
        <FormFieldColor<FormFields>
          name="tags.0.textColor"
          placeholder="Text (Hex)"
          sampleDefaultBgColor={ CIRCLE_BG_COLOR_DEFAULT.textColor }
        />
        <GridItem colSpan={{ base: 1, lg: 2 }}>
          <FormFieldText<FormFields>
            name="tags.0.tooltipDescription"
            placeholder="Tag description (max 80 characters)"
            maxH="160px"
            rules={{ maxLength: 80 }}
            asComponent="Textarea"
          />
        </GridItem>
      </Grid>
    </GridItem>
  );
};

export default React.memo(PublicTagsUpdateFields);
