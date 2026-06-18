// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';

import { afterEach, describe, expect, it, vi } from 'vitest';

import TxFeeRefundBadge from './TxFeeRefundBadge';

vi.mock('toolkit/chakra/badge', () => ({
  [String('Badge')]: ({ children, colorPalette, startElement }: { children: React.ReactNode; colorPalette?: string; startElement?: React.ReactNode }) => (
    <span data-color-palette={ colorPalette }>{ startElement }{ children }</span>
  ),
}));

vi.mock('toolkit/chakra/tooltip', () => ({
  [String('Tooltip')]: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('ui/shared/IconSvg', () => ({
  'default': ({ name }: { name: string }) => <svg data-icon={ name }/>,
}));

function makeTx(feeRefund: string | null | undefined, feeValue: string) {
  return {
    fee_refund: feeRefund,
    fee: { value: feeValue, type: 'actual' as const },
  };
}

describe('TxFeeRefundBadge', () => {
  afterEach(cleanup);

  it('renders nothing when fee_refund is zero', () => {
    const { container } = render(<TxFeeRefundBadge tx={ makeTx('0', '21000000000000') }/>);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when fee_refund is null', () => {
    const { container } = render(<TxFeeRefundBadge tx={ makeTx(null, '21000000000000') }/>);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when fee_refund is undefined', () => {
    const { container } = render(<TxFeeRefundBadge tx={ makeTx(undefined, '21000000000000') }/>);
    expect(container.firstChild).toBeNull();
  });

  it('renders "Quota-Subsidized" when fee_refund is partial (less than gross fee)', () => {
    // refund of 5000 out of 21000
    render(<TxFeeRefundBadge tx={ makeTx('5000000000000', '21000000000000') }/>);
    expect(screen.getByText('Quota-Subsidized')).toBeTruthy();
  });

  it('renders "Gas-Free" when fee_refund equals gross fee (fully feeless)', () => {
    render(<TxFeeRefundBadge tx={ makeTx('21000000000000', '21000000000000') }/>);
    expect(screen.getByText('Gas-Free')).toBeTruthy();
  });

  it('renders "Gas-Free" when fee_refund exceeds gross fee', () => {
    // refund > fee still counts as fully feeless
    const { getByText } = render(<TxFeeRefundBadge tx={ makeTx('99999999999999', '21000000000000') }/>);
    expect(getByText('Gas-Free')).toBeTruthy();
  });

  it('uses green colorPalette for Gas-Free and teal for Quota-Subsidized', () => {
    const { getByText, rerender } = render(<TxFeeRefundBadge tx={ makeTx('21000000000000', '21000000000000') }/>);
    expect(getByText('Gas-Free').closest('[data-color-palette]')?.getAttribute('data-color-palette')).toBe('green');

    rerender(<TxFeeRefundBadge tx={ makeTx('5000000000000', '21000000000000') }/>);
    expect(getByText('Quota-Subsidized').closest('[data-color-palette]')?.getAttribute('data-color-palette')).toBe('teal');
  });
});
