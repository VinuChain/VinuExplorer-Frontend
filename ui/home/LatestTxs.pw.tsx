import React from 'react';

import * as txMock from 'mocks/txs/tx';
import * as socketServer from 'playwright/fixtures/socketServer';
import { test as base, expect, devices } from 'playwright/lib';

import LatestTxs from './LatestTxs';

export const test = base.extend<socketServer.SocketServerFixture>({
  createSocket: socketServer.createSocket,
});

test.describe('mobile', () => {
  test.use({ viewport: devices['iPhone 13 Pro'].viewport });
  test('default view', async({ render, mockApiResponse }) => {
    await mockApiResponse('general:homepage_txs', [
      txMock.base,
      txMock.withContractCreation,
      txMock.withTokenTransfer,
      txMock.withWatchListNames,
    ]);

    const component = await render(<LatestTxs/>);
    await expect(component).toHaveScreenshot();
  });
});

test('default view +@dark-mode', async({ render, mockApiResponse }) => {
  await mockApiResponse('general:homepage_txs', [
    txMock.base,
    txMock.withContractCreation,
    txMock.withTokenTransfer,
    txMock.withWatchListNames,
  ]);

  const component = await render(<LatestTxs/>);
  await expect(component).toHaveScreenshot();
});

test.describe('socket', () => {
  test.describe.configure({ mode: 'serial' });

  const hooksConfig = {
    router: {
      pathname: '/',
      query: {},
    },
  };

  // The global new-transaction socket event only carries a count, so the list
  // announces new transactions in the notice and applies them (refetching its
  // first page in place, no page reload) only when the user asks. Rows must
  // not move under the reader on every socket burst.
  test('new item', async({ render, mockApiResponse, page, createSocket }) => {
    await mockApiResponse('general:homepage_txs', [
      txMock.base,
      txMock.withContractCreation,
      txMock.withTokenTransfer,
    ], { times: 1 });

    const component = await render(<LatestTxs/>, { hooksConfig }, { withSocket: true });

    // Connect the mock socket and wait for the component to join the channel
    // before sending; the hook only joins once the initial fetch resolves.
    const socket = await createSocket();
    const channel = await socketServer.joinChannel(socket, 'transactions:new_transaction');

    // LatestTxs renders both a mobile and a desktop copy of each row; scope to
    // the visible (desktop, at the default viewport) one.
    await expect(page.locator(`a[href*="/tx/${ txMock.base.hash }"]:visible`).first()).toBeVisible();

    // The refreshed first page (served once the user acts) carries a brand-new
    // transaction at the top.
    const newTxHash = '0x0000000000000000000000000000000000000000000000000000000000001234';
    await mockApiResponse('general:homepage_txs', [
      { ...txMock.base, hash: newTxHash },
      txMock.base,
      txMock.withContractCreation,
      txMock.withTokenTransfer,
    ]);

    socketServer.sendMessage(socket, channel, 'transaction', { transaction: 1 });

    // Announced, not applied: the notice offers an accessible action and the
    // list is unchanged.
    const notice = component.getByRole('button', { name: '1 more transaction' });
    await expect(notice).toBeVisible();
    await expect(page.locator(`a[href*="/tx/${ newTxHash }"]`)).toHaveCount(0);

    await notice.click();

    // Applied on user action: the new row is in, the counter is back to zero.
    await expect(page.locator(`a[href*="/tx/${ newTxHash }"]:visible`).first()).toBeVisible();
    await expect(notice).toBeHidden();
  });
});
