import type { Page } from '@playwright/test';
import React from 'react';

import { test, expect } from 'playwright/lib';
import { Button } from 'toolkit/chakra/button';
import { Link } from 'toolkit/chakra/link';

// WCAG 2.4.7 Focus Visible (AA). axe does not evaluate focus styles, so the
// accessibility scan that found every other violation on this site reported
// nothing at all while keyboard focus was invisible on every control.
//
// This asserts the computed outline after a real Tab press, which is what
// catches the failure mode that actually happened: the element matched
// `:focus-visible` and still resolved its outline to `hidden`, because
// `focusRingStyle: 'hidden'` on body outranked the global fallback rule. A
// test checking only that the element is focused, or that a rule exists
// somewhere in the stylesheet, would have passed throughout.

type Ring = { tag: string; focusVisible: boolean; indicator: string; visible: boolean };

function readFocusRing(page: Page): Promise<Ring> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    const empty = { tag: '(none)', focusVisible: false, indicator: 'nothing focused', visible: false };

    if (!el || el === document.body) {
      return empty;
    }

    const s = getComputedStyle(el);
    const width = parseFloat(s.outlineWidth) || 0;
    const hasOutline = s.outlineStyle !== 'none' && s.outlineStyle !== 'hidden' && width > 0;
    // A component may draw its own indicator instead; it just may not leave
    // the user with none.
    const hasShadow = s.boxShadow !== 'none' && s.boxShadow !== '';

    return {
      tag: el.tagName,
      focusVisible: el.matches(':focus-visible'),
      indicator: `outline ${ s.outlineStyle } ${ width }px, box-shadow ${ s.boxShadow }`,
      visible: hasOutline || hasShadow,
    };
  });
}

test('keyboard focus is visible on a button and a link +@dark-mode', async({ render, page }) => {
  await render(
    <div>
      <Button>Press me</Button>
      <Link href="https://example.com">A link</Link>
    </div>,
  );

  await page.keyboard.press('Tab');
  const button = await readFocusRing(page);

  expect(button.tag).toBe('BUTTON');
  expect(button.focusVisible).toBe(true);
  expect(button.visible, `button ${ button.indicator }`).toBe(true);

  await page.keyboard.press('Tab');
  const link = await readFocusRing(page);

  expect(link.tag).toBe('A');
  expect(link.focusVisible).toBe(true);
  expect(link.visible, `link ${ link.indicator }`).toBe(true);
});
