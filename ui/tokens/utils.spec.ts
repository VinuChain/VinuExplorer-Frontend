import { describe, expect, it } from 'vitest';

import { SORT_OPTIONS } from './utils';

describe('tokens SORT_OPTIONS', () => {
  it('offers only sorts the tokens API can apply to the whole dataset', () => {
    // "label" is not a backend sort field; offering it would reorder only the current page.
    expect(SORT_OPTIONS.filter((option) => option.value.startsWith('label-'))).toEqual([]);
  });
});
