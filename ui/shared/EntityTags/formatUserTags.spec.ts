import { describe, it, expect } from 'vitest';

import formatUserTags from './formatUserTags';

describe('formatUserTags', () => {
  it('maps private_tags with ordinal 1000', () => {
    const result = formatUserTags({
      private_tags: [ { label: 'Eco', display_name: 'Eco', address_hash: '0x0' } ],
      watchlist_names: [],
      public_tags: [],
    });

    expect(result).toEqual([
      { slug: 'Eco', name: 'Eco', tagType: 'private_tag', ordinal: 1_000 },
    ]);
  });

  it('maps watchlist_names with ordinal 1000', () => {
    const result = formatUserTags({
      private_tags: [],
      watchlist_names: [ { label: 'Watch1', display_name: 'Watch1' } ],
      public_tags: [],
    });

    expect(result).toEqual([
      { slug: 'Watch1', name: 'Watch1', tagType: 'watchlist', ordinal: 1_000 },
    ]);
  });

  it('does not surface public_tags — the /api/v1/metadata endpoint owns explorer-given tags', () => {
    const result = formatUserTags({
      private_tags: [],
      watchlist_names: [],
      public_tags: [ {
        label: 'VIR Ecosystem Wallet',
        display_name: 'VIR Ecosystem Wallet',
        address_hash: '0x0',
        tag_type: 'information',
        meta: { tagIcon: 'http://example/icon.png', textColor: '#46b0fe' },
      } ],
    });

    expect(result).toEqual([]);
  });
});
