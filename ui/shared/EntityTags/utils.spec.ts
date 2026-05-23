import type { EntityTag } from './types';

import { describe, it, expect } from 'vitest';

import { CATEGORY_BROWSE_SLUG, getCategoryLabel, getTagLinkParams, isCategoryTagType } from './utils';

describe('getCategoryLabel', () => {
  it.each([
    [ 'liquidity_pool', 'Liquidity Pool' ],
    [ 'exchange', 'Exchange' ],
    [ 'defi', 'DeFi' ],
    [ 'meme', 'Meme' ],
    [ 'smart_contract', 'Smart Contract' ],
  ] as const)('maps %s -> %s', (tagType, expected) => {
    expect(getCategoryLabel(tagType)).toBe(expected);
  });

  it('returns undefined for non-category types', () => {
    expect(getCategoryLabel('name')).toBeUndefined();
    expect(getCategoryLabel('protocol')).toBeUndefined();
    expect(getCategoryLabel('generic')).toBeUndefined();
    expect(getCategoryLabel('burn')).toBeUndefined();
  });
});

describe('isCategoryTagType', () => {
  it('classifies category-only types as true', () => {
    expect(isCategoryTagType('liquidity_pool')).toBe(true);
    expect(isCategoryTagType('exchange')).toBe(true);
  });

  it('classifies tag-specific types as false', () => {
    expect(isCategoryTagType('protocol')).toBe(false);
    expect(isCategoryTagType('name')).toBe(false);
    expect(isCategoryTagType('generic')).toBe(false);
    expect(isCategoryTagType('burn')).toBe(false);
  });
});

describe('getTagLinkParams', () => {
  const baseTag: EntityTag = {
    slug: 'vir-vin-lp',
    name: 'VIR/VIN LP',
    tagType: 'liquidity_pool',
    ordinal: 0,
    meta: {
      tagUrl: 'https://vinuchain.vinuswap.org/?inputCurrency=0x1&outputCurrency=0x2',
    },
  };

  it('routes category-typed tags to the _category sentinel listing, ignoring meta.tagUrl', () => {
    const link = getTagLinkParams(baseTag);
    expect(link?.type).toBe('internal');
    expect(link?.href).toContain(`/accounts/label/${ CATEGORY_BROWSE_SLUG }`);
    expect(link?.href).toContain('tagType=liquidity_pool');
    // Query-string encoder (nextjs route()) uses '+' for spaces.
    expect(link?.href).toContain('tagName=Liquidity+Pool');
    // tagUrl must NOT leak into the category-browse link.
    expect(link?.href).not.toContain('vinuswap.org');
  });

  it('keeps meta.tagUrl as an external link for non-category types', () => {
    const tag: EntityTag = { ...baseTag, tagType: 'protocol' };
    const link = getTagLinkParams(tag);
    expect(link?.type).toBe('external');
    expect(link?.href).toContain('vinuswap.org');
  });

  it('routes the legacy generic/protocol/project/burn types to the specific-label listing when no tagUrl is set', () => {
    const tag: EntityTag = { slug: 'aerodrome', name: 'Aerodrome', tagType: 'protocol', ordinal: 0 };
    const link = getTagLinkParams(tag);
    expect(link?.type).toBe('internal');
    expect(link?.href).toContain('/accounts/label/aerodrome');
    expect(link?.href).toContain('tagType=protocol');
  });

  it('returns undefined for an opaque/unknown tag type with no tagUrl', () => {
    const tag: EntityTag = { slug: 'mystery', name: 'Mystery', tagType: 'classifier', ordinal: 0 };
    expect(getTagLinkParams(tag)).toBeUndefined();
  });

  describe('renderMode="name" on a category-type tag', () => {
    it('honors meta.tagUrl as an external link (Tag chip is identity, not browse)', () => {
      const link = getTagLinkParams(baseTag, undefined, 'name');
      expect(link?.type).toBe('external');
      expect(link?.href).toContain('vinuswap.org');
    });

    it('falls back to the specific-slug page when no tagUrl is set', () => {
      const tag: EntityTag = { ...baseTag, meta: undefined };
      const link = getTagLinkParams(tag, undefined, 'name');
      expect(link?.type).toBe('internal');
      expect(link?.href).toContain('/accounts/label/vir-vin-lp');
      expect(link?.href).toContain('tagType=liquidity_pool');
      // Must NOT be the category-browse sentinel.
      expect(link?.href).not.toContain(`slug=${ CATEGORY_BROWSE_SLUG }`);
    });
  });
});
