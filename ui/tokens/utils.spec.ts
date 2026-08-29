import type { TokensSortingField } from 'types/api/tokens';

import { describe, expect, it } from 'vitest';

import { SORT_OPTIONS } from './utils';

// The fields BlockScoutWeb.PagingHelper.do_tokens_sorting/2 actually applies.
// Anything else falls through to its `do_tokens_sorting(_, _), do: []` clause
// and is silently ignored, so an option outside this set reads to the user as
// "sort the list" and delivers "sort the rows already on screen" - which is
// what the label sort did on a paginated table.
const API_SORT_FIELDS: ReadonlyArray<TokensSortingField> = [
  'name',
  'fiat_value',
  'holder_count',
  'circulating_market_cap',
];

describe('tokens SORT_OPTIONS', () => {
  it('offers only sorts the API applies to the whole list', () => {
    const expected = [
      'default',
      ...API_SORT_FIELDS.flatMap((field) => [ `${ field }-asc`, `${ field }-desc` ]),
    ].sort();

    expect(SORT_OPTIONS.map((option) => option.value).sort()).toEqual(expected);
  });
});
