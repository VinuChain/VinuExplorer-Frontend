import { Box } from '@chakra-ui/react';
import React from 'react';

import { test, expect } from 'playwright/lib';
import { Skeleton } from 'toolkit/chakra/skeleton';
import { Tooltip } from 'toolkit/chakra/tooltip';
import { TooltipClickStory } from 'toolkit/chakra/TooltipClickStory';
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
