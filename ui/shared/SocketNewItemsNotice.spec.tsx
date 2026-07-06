// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { describe, expect, it, vi } from 'vitest';

import SocketNewItemsNotice from './SocketNewItemsNotice';

vi.mock('@chakra-ui/react', () => {
  const chakra = (Component: React.ComponentType<Record<string, unknown>> | keyof React.JSX.IntrinsicElements) => {
    if (typeof Component !== 'string') {
      return Component;
    }

    return ({
      appearance,
      bg,
      borderWidth,
      color,
      cursor,
      display,
      fontFamily,
      fontSize,
      fontWeight,
      lineHeight,
      m,
      p,
      textAlign,
      verticalAlign,
      _focusVisible,
      _hover,
      ...props
    }: Record<string, unknown>) => React.createElement(Component, props);
  };

  return {
    [String('Text')]: ({ children }: { children: React.ReactNode }) => <span>{ children }</span>,
    chakra,
  };
});

vi.mock('configs/app', () => ({
  'default': {
    features: {
      flashblocks: {
        isEnabled: true,
        name: 'flashblock',
      },
    },
  },
}));

vi.mock('toolkit/chakra/alert', () => ({
  [String('Alert')]: ({ children }: { children: React.ReactNode }) => <div role="alert">{ children }</div>,
}));

vi.mock('toolkit/chakra/button', () => ({
  [String('Button')]: ({
    children,
    onClick,
    type,
  }: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    type?: 'button' | 'submit' | 'reset';
  }) => <button type={ type } onClick={ onClick }>{ children }</button>,
}));

vi.mock('toolkit/chakra/link', () => ({
  [String('Link')]: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href?: string;
  }) => <a href={ href }>{ children }</a>,
}));

vi.mock('toolkit/chakra/skeleton', () => ({
  [String('Skeleton')]: ({ children }: { children?: React.ReactNode }) => <div>{ children }</div>,
}));

vi.mock('toolkit/chakra/table', () => ({
  [String('TableCell')]: ({ children }: { children: React.ReactNode }) => <td>{ children }</td>,
  [String('TableRow')]: ({ children }: { children: React.ReactNode }) => <tr>{ children }</tr>,
}));

describe('SocketNewItemsNotice', () => {
  it('renders URL-backed notices as links', () => {
    render(<SocketNewItemsNotice url="/txs" num={ 2 }/>);

    const link = screen.getByRole('link', { name: '2 more transactions' });

    expect(link.getAttribute('href')).toBe('/txs');
  });

  it('renders action-only notices as keyboard-accessible buttons', () => {
    const onLinkClick = vi.fn();

    render(<SocketNewItemsNotice type="block" num={ 3 } onLinkClick={ onLinkClick }/>);

    const action = screen.getByRole('button', { name: '3 more blocks' });
    expect(screen.queryByRole('link', { name: '3 more blocks' })).toBeNull();

    fireEvent.click(action);

    expect(onLinkClick).toHaveBeenCalledTimes(1);
  });
});
