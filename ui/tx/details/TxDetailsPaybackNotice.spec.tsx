// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';

import type { Transaction } from 'types/api/transaction';

import config from 'configs/app';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TxDetailsPaybackNotice from './TxDetailsPaybackNotice';

vi.mock('configs/app', () => ({
  'default': {
    chain: { id: '206', currency: { symbol: 'VC' } },
  },
}));

vi.mock('toolkit/chakra/alert', () => ({
  [String('Alert')]: ({ children, status }: { children: React.ReactNode; status?: string }) => <div role="alert" data-status={ status }>{ children }</div>,
}));

vi.mock('ui/shared/DetailedInfo/DetailedInfo', () => ({
  [String('ItemLabel')]: ({ children }: { children: React.ReactNode }) => <div>{ children }</div>,
  [String('ItemValue')]: ({ children }: { children: React.ReactNode }) => <div>{ children }</div>,
}));

const KNOWN_BUG_CONTRACT = '0xdea4687fdba2528d1b30222e199c90b63af8c850';

function makeStakeForTx(to: string) {
  return {
    to: { hash: to },
    raw_input: '0x4bf69206' + '00'.repeat(64),
    method: 'stakeFor',
    decoded_input: null,
    value: '2000000000000000000000',
  } as unknown as Transaction;
}

describe('TxDetailsPaybackNotice', () => {
  afterEach(() => {
    cleanup();
    (config.chain as { id?: string }).id = '206';
  });

  it('renders the known-bug warning for a stakeFor on the testnet deployment', () => {
    render(<TxDetailsPaybackNotice isLoading={ false } data={ makeStakeForTx(KNOWN_BUG_CONTRACT) }/>);
    expect(screen.getByRole('alert').getAttribute('data-status')).toBe('warning');
  });

  it('renders nothing on a chain without a PaybackV2 deployment (mainnet 207)', () => {
    (config.chain as { id?: string }).id = '207';
    const { container } = render(<TxDetailsPaybackNotice isLoading={ false } data={ makeStakeForTx(KNOWN_BUG_CONTRACT) }/>);
    expect(container.firstChild).toBeNull();
  });
});
