import type { EntityTagType, EntityTag } from './types';
import type { UserTags } from 'types/api/addressParams';

const KNOWN_PUBLIC_TAG_TYPES: ReadonlySet<string> = new Set<EntityTagType>([
  'name', 'generic', 'classifier', 'information', 'note',
  'protocol', 'meme', 'exchange', 'liquidity_pool',
] as Array<EntityTagType>);

export default function formatUserTags(data: UserTags | undefined): Array<EntityTag> {
  return [
    ...(data?.private_tags || []).map((tag) => ({ slug: tag.label, name: tag.display_name, tagType: 'private_tag' as const, ordinal: 1_000 })),
    ...(data?.watchlist_names || []).map((tag) => ({ slug: tag.label, name: tag.display_name, tagType: 'watchlist' as const, ordinal: 1_000 })),
    ...(data?.public_tags || []).map((tag) => {
      const rawType = tag.tag_type;
      const tagType = (rawType && KNOWN_PUBLIC_TAG_TYPES.has(rawType) ? rawType : 'generic') as EntityTagType;
      return {
        slug: tag.label,
        name: tag.display_name,
        tagType,
        meta: tag.meta || undefined,
        ordinal: 900,
      };
    }),
  ];
}
