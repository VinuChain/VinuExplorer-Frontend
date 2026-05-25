import type { TokenLabelSearchItem } from 'types/api/token';

import { makePrettyLink } from 'toolkit/utils/url';
import { withFallbackLabelIcons } from 'ui/shared/EntityTags/utils';

export function getTokenLabelTags(token: TokenLabelSearchItem) {
  return withFallbackLabelIcons(token.metadata?.tags ?? []).filter((tag) => tag.tagType !== 'name' && tag.tagType !== 'generic');
}

export function getTokenLabelWebsite(token: TokenLabelSearchItem) {
  const tagWebsite = token.metadata?.tags.find((tag) => tag.meta?.tagUrl)?.meta?.tagUrl;
  return makePrettyLink(token.socials?.website || tagWebsite);
}
