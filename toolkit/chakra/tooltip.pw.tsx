import { Box } from '@chakra-ui/react';
import React from 'react';

import { test, expect } from 'playwright/lib';
import { Skeleton } from 'toolkit/chakra/skeleton';
import { Tooltip } from 'toolkit/chakra/tooltip';
import { TooltipClickStory, TooltipControlledStory, TooltipMountCountStory, TooltipToggleStory } from 'toolkit/chakra/TooltipClickStory';
import { TruncatedText } from 'toolkit/components/truncation/TruncatedText';

test.use({ viewport: { width: 300, height: 200 } });

const POSITIONER = '.chakra-tooltip__positioner';

test('opens on the first hover', async({ render, page }) => {
  await render(<Tooltip content="tip text"><button>trigger</button></Tooltip>);
  await expect(page.locator(POSITIONER)).toHaveCount(0);

  await page.getByText('trigger').hover();
  await expect(page.getByText('tip text')).toBeVisible();
});

test('opens on keyboard focus', async({ render, page }) => {
  await render(<Tooltip content="tip text"><button>trigger</button></Tooltip>);

  await page.keyboard.press('Tab');
  await expect(page.getByText('trigger')).toBeFocused();
  await expect(page.getByText('tip text')).toBeVisible();
});

test('controlled open tooltip is mounted without interaction', async({ render, page }) => {
  await render(<Tooltip content="tip text" open><button>trigger</button></Tooltip>);
  await expect(page.getByText('tip text')).toBeVisible();
});

test('first click on the trigger reaches its handler once', async({ render, page }) => {
  await render(<TooltipClickStory/>);

  await page.getByText(/clicks/).click();
  await expect(page.getByText('clicks: 1')).toBeVisible();
});

test('disabled tooltip never mounts', async({ render, page }) => {
  await render(<Tooltip content="tip text" disabled><button>trigger</button></Tooltip>);

  await page.getByText('trigger').hover();
  await page.waitForTimeout(400);
  await expect(page.locator(POSITIONER)).toHaveCount(0);
});

// failure mode: lazyMount={ false } ignored, so content (nav sub-links) is missing from the DOM until hovered
test('lazyMount false keeps the content in the DOM before any interaction', async({ render, page }) => {
  await render(<Tooltip content="tip text" lazyMount={ false }><button>trigger</button></Tooltip>);
  await expect(page.locator(POSITIONER)).toHaveCount(1);
  await expect(page.getByText('tip text')).toHaveCount(1);
});

// failure mode: focus lands on a button inside a container trigger, the swap destroys it and focus falls to body
test('keyboard focus on a descendant of the trigger survives the activation', async({ render, page }) => {
  await render(<Tooltip content="tip text"><div><button>inner button</button></div></Tooltip>);

  await page.keyboard.press('Tab');
  await expect(page.getByText('inner button')).toBeFocused();
  await expect(page.getByText('tip text')).toBeVisible();
  await expect(page.getByText('inner button')).toBeFocused();
});

// failure mode: the first tap lands on the swapped-out node and the tooltip opens only on the second tap
test.describe('touch', () => {
  test.use({ hasTouch: true });

  test('opens on the first tap', async({ render, page }) => {
    await render(<Tooltip content="tip text"><button>trigger</button></Tooltip>);
    await page.getByText('trigger').tap();
    await expect(page.getByText('tip text')).toBeVisible();
  });
});

// failure mode: a tooltip disabled on mobile still swaps (remounts) its trigger on tap
test('disableOnMobile never remounts the trigger', async({ render, page }) => {
  await render(<TooltipMountCountStory disableOnMobile/>);
  await expect(page.getByText('mounts: 1')).toBeVisible();

  await page.getByText('trigger').hover();
  await page.getByText('trigger').click();
  await page.waitForTimeout(400);
  await expect(page.getByText('mounts: 1')).toBeVisible();
  await expect(page.locator(POSITIONER)).toHaveCount(0);
});

// failure mode: a popover trigger wrapped in a lazy tooltip is swapped out mid-click and the popover loses its anchor
test('eager tooltip never swaps its trigger', async({ render, page }) => {
  await render(<TooltipMountCountStory eager/>);
  await page.getByText('trigger').hover();
  await expect(page.getByText('tip text')).toBeVisible();
  await expect(page.getByText('mounts: 1')).toBeVisible();
});

// failure mode: a controlled tooltip that starts closed never shows when the caller opens it later
test('controlled tooltip starting closed opens when the caller opens it', async({ render, page }) => {
  await render(<TooltipControlledStory/>);
  await expect(page.locator(POSITIONER)).toHaveCount(0);

  await page.getByText('open it').click();
  await expect(page.getByText('tip text')).toBeVisible();
});

// failure mode: pointer leaves the swapped node within openDelay and the tooltip sticks open
test('leaving right after the first hover does not leave the tooltip open', async({ render, page }) => {
  await render(<Tooltip content="tip text"><button>trigger</button></Tooltip>);

  await page.getByText('trigger').hover();
  await page.mouse.move(250, 180);
  await page.waitForTimeout(600);
  await expect(page.getByText('tip text')).toBeHidden();
});

test('skeleton row keeps its box, loading and idle', async({ render, page }) => {
  await render(
    <Box display="flex" flexDirection="column" gap={ 2 }>
      <Skeleton loading data-testid="loading" w="100px" h="20px"/>
      <Skeleton loading={ false } data-testid="idle" w="100px" h="20px">content</Skeleton>
    </Box>,
  );

  const loading = await page.getByTestId('loading').boundingBox();
  const idle = await page.getByTestId('idle').boundingBox();
  expect(loading).toEqual({ ...loading, width: 100, height: 20 });
  expect(idle).toEqual({ ...idle, width: 100, height: 20 });
});

test('tooltip inside a loading skeleton stays unmounted', async({ render, page }) => {
  await render(
    <Skeleton loading w="100px" h="20px">
      <Tooltip content="tip text"><span>cell</span></Tooltip>
    </Skeleton>,
  );
  await expect(page.locator(POSITIONER)).toHaveCount(0);
});

test('truncated text shows its tooltip on hover only when truncated', async({ render, page }) => {
  await render(
    <Box w="80px" display="flex" flexDirection="column">
      <TruncatedText text="a very long text that does not fit"/>
      <TruncatedText text="short"/>
    </Box>,
  );
  await expect(page.locator(POSITIONER)).toHaveCount(0);

  await page.getByText('short').hover();
  await page.waitForTimeout(400);
  await expect(page.locator(POSITIONER)).toHaveCount(0);

  await page.getByText(/a very long/).hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
});

// the rest of the specs run at 300px, i.e. the mobile branch; cover the desktop one too
test.describe('desktop viewport', () => {
  test.use({ viewport: { width: 1280, height: 300 } });

  test('opens on hover and on descendant focus', async({ render, page }) => {
    await render(
      <Box display="flex" gap={ 4 }>
        <Tooltip content="hover tip"><button>hover me</button></Tooltip>
        <Tooltip content="focus tip"><div><button>inner button</button></div></Tooltip>
      </Box>,
    );

    await page.getByText('hover me').hover();
    await expect(page.getByText('hover tip')).toBeVisible();

    await page.getByText('hover me').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByText('inner button')).toBeFocused();
    await expect(page.getByText('focus tip')).toBeVisible();
  });

  // failure mode: the lazily mounted tooltip re-reads the breakpoint on its first render, gets the SSR
  // fallback (mobile), renders raw children, and keyboard focus drops to the body
  test('disableOnMobile tooltip keeps keyboard focus and opens on desktop', async({ render, page }) => {
    await render(<Tooltip content="tip text" disableOnMobile><button>trigger</button></Tooltip>);

    await page.keyboard.press('Tab');
    await expect(page.getByText('trigger')).toBeFocused();
    await expect(page.getByText('tip text')).toBeVisible();
    await expect(page.getByText('trigger')).toBeFocused();
  });

  // failure mode: a click that activates the tooltip is treated as a tap on desktop and force-opens it
  test('a click without hover does not force-open the tooltip on desktop', async({ render, page }) => {
    await render(<Tooltip content="tip text" disableOnMobile><button>trigger</button></Tooltip>);

    await page.getByText('trigger').dispatchEvent('click');
    await page.waitForTimeout(600);
    await expect(page.getByText('tip text')).toBeHidden();
  });

  // failure mode: activation is never reset, so re-enabling replays the old focus activation and steals focus
  test('re-enabling a tooltip does not steal focus', async({ render, page }) => {
    await render(<TooltipToggleStory/>);

    await page.keyboard.press('Tab');
    await expect(page.getByText('trigger')).toBeFocused();
    await expect(page.getByText('tip text')).toBeVisible();

    await page.getByText('toggle').click();
    await page.getByLabel('other input').click();
    await expect(page.getByLabel('other input')).toBeFocused();

    await page.getByText('toggle').click();
    await page.waitForTimeout(400);
    await expect(page.getByText('toggle')).toBeFocused();
  });

  // failure mode: a press released outside the trigger leaves the pressed flag set, so hover never activates the tooltip
  test('press released outside the trigger does not block later hover activation', async({ render, page }) => {
    await render(<Tooltip content="tip text"><button>trigger</button></Tooltip>);

    await page.getByText('trigger').dispatchEvent('pointerdown', { pointerType: 'mouse', bubbles: true });
    await page.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse' })));

    await page.getByText('trigger').hover();
    await expect(page.getByText('tip text')).toBeVisible();
  });
});
