import React from 'react';

import * as tokens from 'mocks/tokens/tokenInfo';
import { test, expect } from 'playwright/lib';

import TokensListItem from './TokensListItem';

// WCAG 2.2 AA 2.5.8 Target Size (Minimum). The criterion exempts a target whose
// 24px circle touches no other target's, which is what saves most dense tables -
// but in this row the social icons sat flush against the token name, and the
// address row was pulled up by a negative margin to 22px from it, so neither
// cleared the exception.
//
// These assert rendered geometry rather than the style props, because the props
// are only correct if they survive the flex layout around them. No screenshot:
// this is about distances, and a baseline would go stale on any visual change.
test('token row targets clear the 24px spacing exception +@mobile -@default', async({ render, page }) => {
  await render(
    <TokensListItem
      token={{ ...tokens.tokenInfoERC20a, socials: { website: 'https://example.com', twitter: 'https://x.com/x' } }}
      index={ 0 }
      page={ 1 }
    />,
  );

  const name = page.locator('a').first();
  const social = page.locator('a[href="https://example.com"]');
  const nameBox = await name.boundingBox();
  const socialBox = await social.boundingBox();

  expect(nameBox).not.toBeNull();
  expect(socialBox).not.toBeNull();

  // Horizontal gap between the name link and the first social icon. Flush (0)
  // before the wrapper's columnGap was introduced.
  const gap = (socialBox?.x ?? 0) - ((nameBox?.x ?? 0) + (nameBox?.width ?? 0));
  expect(gap, `name-to-social gap ${ gap }px`).toBeGreaterThanOrEqual(8);
});
