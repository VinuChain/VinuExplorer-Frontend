import type { EntityTag, EntityTagType } from './types';

import { route } from 'nextjs/routes';

import type { TMultichainContext } from 'lib/contexts/multichain';

// Sentinel slug used by the /accounts/label/[slug] route to mean
// "browse every address that carries a tag of this type, regardless
// of the specific tag label". AccountsLabelSearch detects this value
// and drops the `slug` filter from the API call so the backend uses
// its category-only `list_by_type` branch. Underscore-prefixed so it
// cannot collide with a user-submitted tag label.
export const CATEGORY_BROWSE_SLUG = '_category';

// "Category-only" tag types — types whose value-add as a Label badge
// is to communicate WHAT KIND of entity an address is, not the tag's
// specific name. The specific name typically duplicates the
// address-name already shown by AddressEntity in the adjacent cell
// (e.g., a "VIR/VIN LP" liquidity_pool tag drives both the address
// title and would otherwise render as a redundant "VIR/VIN LP"
// badge). For these types the badge displays the human category
// label and clicking browses every address of the same type.
//
// Mirrors the curated Category Label set in
// ui/publicTags/submit/fields/PublicTagsSubmitFieldTagType.tsx so every
// submittable category routes through the same `_category` sentinel
// and renders a consistent Label badge across the explorer.
const CATEGORY_LABELS: Partial<Record<EntityTagType, string>> = {
  liquidity_pool: 'Liquidity Pool',
  exchange: 'Exchange',
  defi: 'DeFi',
  meme: 'Meme',
  stablecoin: 'Stablecoin',
  layer_1: 'Layer 1',
  layer_2: 'Layer 2',
  smart_contract: 'Smart Contract',
  project: 'Project',
  protocol: 'Protocol',
  generic: 'General',
  burn: 'Burn',
};

export function getCategoryLabel(tagType: EntityTagType): string | undefined {
  return CATEGORY_LABELS[tagType];
}

export function isCategoryTagType(tagType: EntityTagType): boolean {
  return tagType in CATEGORY_LABELS;
}

function getSubmittedTagIcon(tags: Array<EntityTag>): string | undefined {
  return tags.find((tag) => tag.tagType === 'name' && tag.meta?.tagIcon)?.meta?.tagIcon ??
    tags.find((tag) => tag.meta?.tagIcon)?.meta?.tagIcon;
}

export function withFallbackLabelIcons(tags: Array<EntityTag>): Array<EntityTag> {
  const submittedTagIcon = getSubmittedTagIcon(tags);
  if (!submittedTagIcon) {
    return tags;
  }

  return tags.map((tag) => {
    if (!isCategoryTagType(tag.tagType) || tag.meta?.tagIcon) {
      return tag;
    }

    return {
      ...tag,
      meta: {
        ...(tag.meta ?? {}),
        tagIcon: submittedTagIcon,
      },
    };
  });
}

export function getAddressLabelTags(tags: Array<EntityTag> | null | undefined): Array<EntityTag> {
  return withFallbackLabelIcons(tags ?? []).filter((tag) => tag.tagType !== 'name' && tag.tagType !== 'generic');
}

export function getTagLinkParams(
  data: EntityTag,
  multichainContext?: TMultichainContext | null,
  renderMode: 'name' | 'category' = 'category',
): { type: 'external' | 'internal'; href: string } | undefined {
  if (data.meta?.warpcastHandle) {
    return {
      type: 'external',
      href: `https://warpcast.com/${ data.meta.warpcastHandle }`,
    };
  }

  // Category-mode badges browse the entire tag_type. EntityTags expands
  // a category-type tag with a name into two chips — Tag (renderMode
  // 'name') and Label (renderMode 'category') — so only the Label chip
  // takes this branch. The Tag chip falls through to identity routing
  // (meta.tagUrl > specific-slug page) below.
  if (renderMode === 'category' && isCategoryTagType(data.tagType)) {
    return {
      type: 'internal',
      href: route(
        {
          pathname: '/accounts/label/[slug]',
          query: { slug: CATEGORY_BROWSE_SLUG, tagType: data.tagType, tagName: getCategoryLabel(data.tagType) ?? data.name },
        },
        multichainContext,
      ),
    };
  }

  if (data.meta?.tagUrl) {
    return {
      type: 'external',
      href: data.meta.tagUrl,
    };
  }

  // renderMode='name' branch for category-type tags (the Tag chip from
  // expandTags' split). The Label sibling takes the _category sentinel
  // above; this one routes to the specific slug so the user lands on
  // "every address with THIS tag" rather than the whole category.
  if (isCategoryTagType(data.tagType)) {
    return {
      type: 'internal',
      href: route({ pathname: '/accounts/label/[slug]', query: { slug: data.slug, tagType: data.tagType, tagName: data.name } }, multichainContext),
    };
  }
}

export function getTagName(data: EntityTag, addressHash?: string) {
  if (data.tagType === 'name' && data.meta?.cexDeposit === 'true' && addressHash) {
    return `${ data.name } (${ addressHash.slice(0, 2 + 5) })`;
  }

  return data.name;
}
