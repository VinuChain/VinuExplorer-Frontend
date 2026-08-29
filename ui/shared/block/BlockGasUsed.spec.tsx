// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';

import { afterEach, describe, expect, it, vi } from 'vitest';

import BlockGasUsed from './BlockGasUsed';

vi.mock('@chakra-ui/react', () => ({
  chakra: (Component: React.ComponentType<Record<string, unknown>>) => Component,
}));

vi.mock('configs/app', () => ({
  'default': { features: { rollup: { isEnabled: false } } },
}));

vi.mock('toolkit/chakra/tooltip', () => ({
  [String('Tooltip')]: ({ children }: { children: React.ReactNode }) => <div>{ children }</div>,
}));

vi.mock('../TextSeparator', () => ({ 'default': () => null }));

vi.mock('../Utilization/Utilization', () => ({
  'default': ({ value }: { value: number }) => <div data-testid="utilization">{ String(value) }</div>,
}));

vi.mock('../GasUsedToTargetRatio', () => ({
  'default': ({ value }: { value: number }) => <div data-testid="target-ratio">{ String(value) }</div>,
}));

describe('BlockGasUsed gas target', () => {
  afterEach(cleanup);

  // Real mainnet values: gas limit is 2^48-1, so a block with a single
  // transfer uses 7.46e-09% of it and the API reports a gas target of
  // -99.9999999850786 on essentially every block. Rendering it produced a
  // flat "-100% of Gas Target" chain-wide, which describes the gas limit
  // rather than the block.
  it('hides the target when the block barely touches a huge gas limit', () => {
    render(
      <BlockGasUsed
        gasUsed="21000"
        gasLimit="281474976710655"
        gasTarget={ -99.9999999850786 }
      />,
    );

    expect(screen.queryByTestId('target-ratio')).toBeNull();
    // the gas used bar itself still renders
    expect(screen.getByTestId('utilization')).toBeTruthy();
  });

  it('shows the target on a chain whose gas limit makes it meaningful', () => {
    render(
      <BlockGasUsed gasUsed="15000000" gasLimit="30000000" gasTarget={ 12.5 }/>,
    );

    expect(screen.getByTestId('target-ratio').textContent).toBe('12.5');
  });

  it('renders nothing when the block used no gas', () => {
    const { container } = render(
      <BlockGasUsed gasUsed="0" gasLimit="281474976710655" gasTarget={ -100 }/>,
    );

    expect(container.innerHTML).toBe('');
  });
});
