import React from 'react';

import type { TokenSocials } from 'types/api/token';

import { test, expect } from 'playwright/lib';

import TokenSocialLinks from './TokenSocialLinks';

const SOCIALS: TokenSocials = {
  website: 'https://vitainu.org',
  twitter: 'https://x.com/vitainucoin',
  telegram: 'https://t.me/vitainu',
};

// These links render an icon and nothing else. The tooltip beside them is a
// separate popup, not an accessible name, so without an explicit label a
// screen reader announces the raw URL. Query by role and name, which is what
// assistive technology actually resolves - a plain visibility check would pass
// with the label removed. No screenshot: this asserts semantics, not pixels.
test('icon-only social links carry an accessible name', async({ render, page }) => {
  await render(<TokenSocialLinks socials={ SOCIALS }/>);

  for (const name of [ 'Website', 'X (Twitter)', 'Telegram' ]) {
    await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
  }
});
