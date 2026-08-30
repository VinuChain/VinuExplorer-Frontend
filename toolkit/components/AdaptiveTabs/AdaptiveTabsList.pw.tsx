import React from 'react';

import { test, expect } from 'playwright/lib';
import { Link } from 'toolkit/chakra/link';

import AdaptiveTabs from './AdaptiveTabs';

const tabs = [
  { id: 'tab1', title: 'First', component: <div>First content</div> },
  { id: 'tab2', title: 'Second', component: <div>Second content</div> },
];

// axe's `aria-required-children` rejects focusable non-tab descendants of `role="tablist"` -
// on the block page it reported "Element has children which are not allowed: a[tabindex],
// nav[tabindex]" for the pagination and countdown link the right slot renders. Plain divs pass,
// so this asserts the condition the rule actually checks rather than the shape of the markup.
test('keeps focusable slot content out of the tablist', async({ render }) => {
  const component = await render(
    <AdaptiveTabs
      tabs={ tabs }
      defaultValue="tab1"
      rightSlot={ <Link href="/blocks">Block countdown</Link> }
    />,
  );

  const tablist = component.getByRole('tablist');

  await expect(tablist).toBeVisible();
  await expect(tablist.getByRole('link')).toHaveCount(0);
  await expect(tablist.getByRole('navigation')).toHaveCount(0);

  // the slot itself still renders, just outside the list
  await expect(component.getByRole('link', { name: 'Block countdown' })).toBeVisible();
});

// Enough long-titled tabs that the list has to cut some into the overflow menu. That menu trigger
// is a Popover control rendered as a focusable div, so while it sits inside the tablist it breaks
// the same rule the slots did - and only in this state, because `getMenuStyles` hides it with
// `visibility: hidden` when everything fits, which takes it out of the accessibility tree and
// hides it from axe.
const manyTabs = Array.from({ length: 12 }, (_, index) => ({
  id: `tab${ index }`,
  title: `A fairly long tab title number ${ index }`,
  component: <div>{ `content ${ index }` }</div>,
}));

test('keeps the overflow menu trigger out of the tablist', async({ render }) => {
  const component = await render(<AdaptiveTabs tabs={ manyTabs } defaultValue="tab0"/>);

  const menu = component.getByLabel('Open tabs menu');

  // the cut has to have actually happened, or this asserts nothing
  await expect(menu).toBeVisible();
  await expect(component.getByRole('tablist').getByLabel('Open tabs menu')).toHaveCount(0);
});
