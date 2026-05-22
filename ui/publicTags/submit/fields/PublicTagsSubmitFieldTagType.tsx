import { createListCollection } from '@chakra-ui/react';
import React from 'react';

import type { FormFields } from '../types';
import type { PublicTagType } from 'types/api/addressMetadata';

import type { SelectOption } from 'toolkit/chakra/select';
import { FormFieldSelect } from 'toolkit/components/forms/fields/FormFieldSelect';

interface Props {
  index: number;
  tagTypes: Array<PublicTagType> | undefined;
}

// VinuExplorer "Category Label" dropdown — the curated list of badge
// categories submitters can attach to a public-tag submission. The
// backend (Explorer.Account.PublicTagSubmission.TagTypes) still
// accepts the broader Blockscout-canonical set; this filter narrows
// the UX to the six categories actually shown alongside the Tag on
// holders / accounts / address pages.
const ALLOWED_CATEGORY_TYPES: Array<{ value: string; label: string }> = [
  { value: 'generic', label: 'General' },
  { value: 'meme', label: 'Meme' },
  { value: 'exchange', label: 'Exchange' },
  { value: 'liquidity_pool', label: 'Liquidity Pool' },
  { value: 'defi', label: 'DeFi' },
  { value: 'protocol', label: 'Protocol' },
  { value: 'project', label: 'Project' },
  { value: 'smart_contract', label: 'Smart Contract' },
];

const PublicTagsSubmitFieldTagType = ({ index, tagTypes }: Props) => {

  const collection = React.useMemo(() => {
    // Intersect the curated allow-list with whatever the backend
    // currently advertises so we never offer a value the server will
    // reject. Falls back to the full allow-list when the backend
    // metadata hasn't loaded yet (typically only happens for a brief
    // flash on first render).
    const backendTypes = new Set((tagTypes ?? []).map((t) => t.type));
    const items: Array<SelectOption> = ALLOWED_CATEGORY_TYPES
      .filter((entry) => backendTypes.size === 0 || backendTypes.has(entry.value))
      .map((entry) => ({ value: entry.value, label: entry.label }));

    return createListCollection<SelectOption>({ items });
  }, [ tagTypes ]);

  return (
    <FormFieldSelect<FormFields, `tags.${ number }.type`>
      name={ `tags.${ index }.type` }
      placeholder="Category label"
      collection={ collection }
      required
    />
  );
};

export default React.memo(PublicTagsSubmitFieldTagType);
