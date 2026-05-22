import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import type { FormFields } from '../types';
import type { PublicTagType } from 'types/api/addressMetadata';

import PublicTagsSubmitFieldTag from './PublicTagsSubmitFieldTag';

const LIMIT = 5;

interface Props {
  tagTypes: Array<PublicTagType> | undefined;
}

const PublicTagsSubmitFieldTags = ({ tagTypes }: Props) => {
  const { control, formState, watch } = useFormContext<FormFields>();
  const { fields, insert, remove } = useFieldArray<FormFields, 'tags'>({
    name: 'tags',
    control,
  });

  const isDisabled = formState.isSubmitting;

  const handleAddFieldClick = React.useCallback((index: number) => {
    insert(index + 1, {
      name: '',
      // Match getFormDefaultValues — the curated Category Label
      // dropdown only offers six values and 'name' is not one of
      // them. Leaving the default at 'name' silently bypassed the
      // restriction for every added row (FormFieldSelect doesn't
      // re-validate against the collection on mount), letting an
      // out-of-policy tag_type reach the backend.
      type: [ 'generic' ],
      url: undefined,
      iconUrl: undefined,
      bgColor: undefined,
      textColor: undefined,
      tooltipDescription: undefined,
    });
  }, [ insert ]);

  const handleRemoveFieldClick = React.useCallback((index: number) => {
    remove(index);
  }, [ remove ]);

  return (
    <>
      { fields.map((field, index) => {
        const errors = formState.errors?.tags?.[ index ];

        return (
          <PublicTagsSubmitFieldTag
            key={ field.id }
            field={ watch(`tags.${ index }`) }
            index={ index }
            tagTypes={ tagTypes }
            errors={ errors }
            isDisabled={ isDisabled }
            onAddClick={ fields.length < LIMIT && index === fields.length - 1 ? handleAddFieldClick : undefined }
            onRemoveClick={ fields.length > 1 ? handleRemoveFieldClick : undefined }
          />
        );
      }) }
    </>
  );
};

export default React.memo(PublicTagsSubmitFieldTags);
