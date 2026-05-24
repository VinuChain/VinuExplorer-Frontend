import type { EntityTag } from './types';

import { describe, it, expect } from 'vitest';

import { CATEGORY_BROWSE_SLUG, getCategoryLabel, getTagLinkParams, isCategoryTagType, withFallbackLabelIcons } from './utils';

describe('getCategoryLabel', () => {
  it.each([
    [ 'liquidity_pool', 'Liquidity Pool' ],
    [ 'exchange', 'Exchange' ],
    [ 'defi', 'DeFi' ],
    [ 'meme', 'Meme' ],
    [ 'smart_contract', 'Smart Contract' ],
    [ 'project', 'Project' ],
    [ 'protocol', 'Protocol' ],
    [ 'generic', 'General' ],
    [ 'burn', 'Burn' ],
  ] as const)('maps %s -> %s', (tagType, expected) => {
    expect(getCategoryLabel(tagType)).toBe(expected);
  });

  it('returns undefined for non-category types', () => {
    expect(getCategoryLabel('name')).toBeUndefined();
    expect(getCategoryLabel('note')).toBeUndefined();
    expect(getCategoryLabel('information')).toBeUndefined();
    expect(getCategoryLabel('classifier')).toBeUndefined();
  });
});

describe('isCategoryTagType', () => {
  it('classifies every submittable category as true', () => {
    expect(isCategoryTagType('liquidity_pool')).toBe(true);
    expect(isCategoryTagType('exchange')).toBe(true);
    expect(isCategoryTagType('defi')).toBe(true);
    expect(isCategoryTagType('meme')).toBe(true);
    expect(isCategoryTagType('smart_contract')).toBe(true);
    expect(isCategoryTagType('project')).toBe(true);
    expect(isCategoryTagType('protocol')).toBe(true);
    expect(isCategoryTagType('generic')).toBe(true);
    expect(isCategoryTagType('burn')).toBe(true);
  });

  it('classifies non-category tag types as false', () => {
    expect(isCategoryTagType('name')).toBe(false);
    expect(isCategoryTagType('note')).toBe(false);
    expect(isCategoryTagType('information')).toBe(false);
    expect(isCategoryTagType('classifier')).toBe(false);
  });
});

describe('withFallbackLabelIcons', () => {
  it('uses a submitted name-tag icon for category label chips that do not have their own icon', () => {
    const result = withFallbackLabelIcons([
      {
        slug: 'vir-ecosystem-wallet',
        name: 'VIR Ecosystem Wallet',
        tagType: 'name',
        ordinal: 0,
        meta: { tagIcon: 'https://example.com/vir.png' },
      },
      {
        slug: 'project',
        name: 'Project',
        tagType: 'project',
        ordinal: 1,
        meta: null,
      },
    ]);

    expect(result[1]?.meta?.tagIcon).toBe('https://example.com/vir.png');
  });

  it('keeps an explicit category tag icon and leaves no-logo labels unchanged', () => {
    const withOwnIcon = withFallbackLabelIcons([
      {
        slug: 'identity',
        name: 'Identity',
        tagType: 'name',
        ordinal: 0,
        meta: { tagIcon: 'https://example.com/name.png' },
      },
      {
        slug: 'project',
        name: 'Project',
        tagType: 'project',
        ordinal: 1,
        meta: { tagIcon: 'https://example.com/project.png' },
      },
    ]);
    expect(withOwnIcon[1]?.meta?.tagIcon).toBe('https://example.com/project.png');

    const noSubmittedIcon = withFallbackLabelIcons([
      { slug: 'project', name: 'Project', tagType: 'project', ordinal: 1, meta: null },
    ]);
    expect(noSubmittedIcon[0]?.meta).toBeNull();
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

  it('routes every category type via the _category sentinel for the default (Label) render', () => {
    for (const [ tagType, label ] of [
      [ 'liquidity_pool', 'Liquidity+Pool' ],
      [ 'exchange', 'Exchange' ],
      [ 'defi', 'DeFi' ],
      [ 'meme', 'Meme' ],
      [ 'smart_contract', 'Smart+Contract' ],
      [ 'project', 'Project' ],
      [ 'protocol', 'Protocol' ],
      [ 'generic', 'General' ],
      [ 'burn', 'Burn' ],
    ] as const) {
      const tag: EntityTag = { slug: `${ tagType }-x`, name: 'Whatever', tagType, ordinal: 0 };
      const link = getTagLinkParams(tag);
      expect(link?.type).toBe('internal');
      expect(link?.href).toContain(`/accounts/label/${ CATEGORY_BROWSE_SLUG }`);
      expect(link?.href).toContain(`tagType=${ tagType }`);
      expect(link?.href).toContain(`tagName=${ label }`);
    }
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

    it('routes the Tag chip to the specific slug for every promoted category type', () => {
      for (const tagType of [ 'project', 'protocol', 'generic', 'burn' ] as const) {
        const tag: EntityTag = { slug: `${ tagType }-tagname`, name: 'Specific Tag', tagType, ordinal: 0 };
        const link = getTagLinkParams(tag, undefined, 'name');
        expect(link?.type).toBe('internal');
        expect(link?.href).toContain(`/accounts/label/${ tagType }-tagname`);
        expect(link?.href).toContain(`tagType=${ tagType }`);
        expect(link?.href).not.toContain(`slug=${ CATEGORY_BROWSE_SLUG }`);
      }
    });
  });
});
