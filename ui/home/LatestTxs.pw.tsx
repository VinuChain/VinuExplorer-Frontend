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

  // The global new-transaction socket event only carries a count, so on a new
  // tx the list refetches its first page and the new transaction appears live,
  // without a manual page reload (mirrors the live behavior of latest blocks).
  test('new item', async({ render, mockApiResponse, page, createSocket }) => {
    await mockApiResponse('general:homepage_txs', [
      txMock.base,
      txMock.withContractCreation,
      txMock.withTokenTransfer,
    ], { times: 1 });

    await render(<LatestTxs/>, { hooksConfig }, { withSocket: true });

    // Connect the mock socket and wait for the component to join the channel
    // before sending; the hook only joins once the initial fetch resolves.
    const socket = await createSocket();
    const channel = await socketServer.joinChannel(socket, 'transactions:new_transaction');

    // LatestTxs renders both a mobile and a desktop copy of each row; scope to
    // the visible (desktop, at the default viewport) one.
    await expect(page.locator(`a[href*="/tx/${ txMock.base.hash }"]:visible`).first()).toBeVisible();

    // A new-tx signal makes the list refetch its first page; serve a refreshed
    // page that includes a brand-new transaction at the top.
    const newTxHash = '0x0000000000000000000000000000000000000000000000000000000000001234';
    await mockApiResponse('general:homepage_txs', [
      { ...txMock.base, hash: newTxHash },
      txMock.base,
      txMock.withContractCreation,
      txMock.withTokenTransfer,
    ]);

    socketServer.sendMessage(socket, channel, 'transaction', { transaction: 1 });

    await expect(page.locator(`a[href*="/tx/${ newTxHash }"]:visible`).first()).toBeVisible();
  });
});
