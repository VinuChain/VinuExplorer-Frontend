import type { TokenInfo } from 'types/api/token';
import type { AggregatedTokenInfo } from 'types/client/multichain-aggregator';

import { withFallbackLabelIcons } from 'ui/shared/EntityTags/utils';

export type TokenWithMetadata = TokenInfo | (AggregatedTokenInfo & Pick<TokenInfo, 'metadata'>);

export function getTokenLabelTags(token: TokenInfo | AggregatedTokenInfo) {
  const tags = 'metadata' in token ? token.metadata?.tags ?? [] : [];

  return withFallbackLabelIcons(tags).filter((tag) => tag.tagType !== 'name' && tag.tagType !== 'generic');
}
