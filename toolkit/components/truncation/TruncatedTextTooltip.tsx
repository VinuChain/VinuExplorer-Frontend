import type { Placement } from '@floating-ui/dom';
import React from 'react';

import { Tooltip } from '../../chakra/tooltip';
import { useDisclosure } from '../../hooks/useDisclosure';

export interface TruncatedTextTooltipProps {
  children: React.ReactNode;
  label: React.ReactNode;
  placement?: Placement;
  interactive?: boolean;
}

export const TruncatedTextTooltip = React.memo(({ children, label, placement, interactive }: TruncatedTextTooltipProps) => {
  const childRef = React.useRef<HTMLElement>(null);
  const [ isTruncated, setTruncated ] = React.useState(false);
  const { open, onToggle, onOpen, onClose } = useDisclosure();

  // the layout read (scrollWidth) happens on the first interaction, not on every mount:
  // rows are rendered by the hundreds and nobody hovers most of them
  const checkAndOpen = React.useCallback(() => {
    const node = childRef.current;
    const truncated = Boolean(node && node.scrollWidth > node.clientWidth);
    setTruncated(truncated);
    truncated && onOpen();
  }, [ onOpen ]);

  // as for now it supports only one child
  // and it is not cleared how to manage case with two or more children
  const child = React.Children.only(children) as React.ReactElement & {
    ref?: React.Ref<React.ReactNode>;
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onFocus?: (event: React.FocusEvent) => void;
    onBlur?: (event: React.FocusEvent) => void;
  };
  const handleClick = React.useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isTruncated) {
      checkAndOpen();
      return;
    }
    onToggle();
  }, [ onToggle, isTruncated, checkAndOpen ]);

  const childProps = child.props as Pick<typeof child, 'onFocus' | 'onBlur'>;
  const handleFocus = React.useCallback((event: React.FocusEvent) => {
    childProps.onFocus?.(event);
    checkAndOpen();
  }, [ childProps, checkAndOpen ]);
  const handleBlur = React.useCallback((event: React.FocusEvent) => {
    childProps.onBlur?.(event);
    onClose();
  }, [ childProps, onClose ]);

  const modifiedChildren = React.cloneElement(
    child,
    {
      ref: childRef,
      onClick: handleClick,
      onMouseEnter: checkAndOpen,
      onMouseLeave: onClose,
      onFocus: handleFocus,
      onBlur: handleBlur,
    } as React.HTMLAttributes<HTMLElement>,
  );

  if (isTruncated) {
    return (
      <Tooltip
        content={ label }
        contentProps={{ maxW: { base: 'calc(100vw - 8px)', lg: '400px' } }}
        positioning={{ placement }}
        open={ open }
        interactive={ interactive }
      >
        { modifiedChildren }
      </Tooltip>
    );
  }

  return modifiedChildren;
});
