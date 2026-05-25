import type { TokenLabelSearchItem } from 'types/api/token';

import { makePrettyLink } from 'toolkit/utils/url';

export function getTokenLabelWebsite(token: TokenLabelSearchItem) {
  const tagWebsite = token.metadata?.tags.find((tag) => tag.meta?.tagUrl)?.meta?.tagUrl;
  return makePrettyLink(token.socials?.website || tagWebsite);
}
