import { Tooltip as ChakraTooltip, Portal, chakra } from '@chakra-ui/react';
import { useClickAway } from '@uidotdev/usehooks';
import * as React from 'react';

import config from 'configs/app';
import useIsMobile from 'lib/hooks/useIsMobile';

import type { LazyActivation } from '../hooks/useLazyActivation';
import { resolveNodePath, useLazyActivation } from '../hooks/useLazyActivation';

export interface TooltipProps extends ChakraTooltip.RootProps {
  selected?: boolean;
  showArrow?: boolean;
  portalled?: boolean;
  portalRef?: React.RefObject<HTMLElement>;
  content: React.ReactNode;
  contentProps?: ChakraTooltip.ContentProps;
  triggerProps?: ChakraTooltip.TriggerProps;
  disabled?: boolean;
  disableOnMobile?: boolean;
  // mount the tooltip machine right away instead of on first interaction; needed when the trigger
  // wraps a popover trigger or other element that must not be swapped out while a click is handled
  eager?: boolean;
}

interface TooltipImplProps extends TooltipProps {
  innerRef: React.ForwardedRef<HTMLDivElement>;
  // how the lazily mounted tooltip was activated; undefined when mounted for other reasons
  activation?: LazyActivation;
  // the breakpoint as settled in the always-mounted lazy wrapper; a hook call here would start from
  // the SSR fallback on its first render, which is wrong for the activation handling below
  isMobile: boolean;
}

const TooltipImpl = (props: TooltipImplProps) => {
  const {
    innerRef,
    activation,
    isMobile,
    showArrow: showArrowProp,
    onOpenChange,
    variant,
    selected,
    children,
    disabled,
    disableOnMobile,
    portalled = true,
    content,
    contentProps,
    portalRef,
    defaultOpen = false,
    lazyMount = true,
    unmountOnExit = true,
    triggerProps,
    closeDelay = 100,
    openDelay = 100,
    interactive,
    ...rest
  } = props;

  const [ open, setOpen ] = React.useState<boolean>(defaultOpen);
  const timeoutRef = React.useRef<number | null>(null);

  const handleOpenChange = React.useCallback((details: { open: boolean }) => {
    setOpen(details.open);
    onOpenChange?.(details);
  }, [ onOpenChange ]);

  const handleOpenChangeManual = React.useCallback((nextOpen: boolean) => {
    timeoutRef.current && window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setOpen(nextOpen);
      onOpenChange?.({ open: nextOpen });
    }, nextOpen ? openDelay : closeDelay);
  }, [ closeDelay, openDelay, onOpenChange ]);

  const handleClickAway = React.useCallback((event: Event) => {
    if (interactive) {
      const closest = (event.target as HTMLElement)?.closest('.chakra-tooltip__positioner');
      if (closest) {
        return;
      }
    }

    handleOpenChangeManual(false);
  }, [ interactive, handleOpenChangeManual ]);

  const clickAwayRef = useClickAway<HTMLButtonElement>(handleClickAway);
  const triggerNodeRef = React.useRef<HTMLButtonElement | null>(null);
  // the click-away handler is armed only while the tooltip is open
  const setTriggerRef = React.useCallback((node: HTMLButtonElement | null) => {
    triggerNodeRef.current = node;
    (clickAwayRef as React.RefObject<HTMLButtonElement | null>).current = open ? node : null;
  }, [ open, clickAwayRef ]);

  const handleTriggerClick = React.useCallback(() => {
    handleOpenChangeManual(!open);
  }, [ handleOpenChangeManual, open ]);

  const handleContentClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // otherwise, the event will be propagated to the trigger
    // and if the trigger is a link, navigation will be triggered
    event.stopPropagation();

    if (interactive) {
      const closestLink = (event.target as HTMLElement)?.closest('a');
      if (closestLink) {
        handleOpenChangeManual(false);
      }
    }
  }, [ interactive, handleOpenChangeManual ]);

  // The machine mounts after the activating event, so it never saw it: open manually.
  // Mounting swaps the trigger node, so a focus-activated trigger is re-focused, and
  // :hover / activeElement are re-checked instead of trusting events on the swapped node.
  React.useEffect(() => {
    if (!activation) {
      return;
    }
    if (activation.type === 'focus') {
      // the focused element (the trigger itself or a descendant) was re-created by the swap
      const focusTarget = resolveNodePath(triggerNodeRef.current, activation.focusPath) ?? triggerNodeRef.current;
      (focusTarget as HTMLElement | null)?.focus?.({ preventScroll: true });
    }
    if (activation.clicked && isMobile) {
      // a tap landed on the node that was swapped out: its click never reached the new trigger
      setOpen(true);
      onOpenChange?.({ open: true });
      return;
    }
    const timeoutId = window.setTimeout(() => {
      const node = triggerNodeRef.current;
      if (!node) {
        return;
      }
      const isStillActive = activation.type === 'pointer' ? node.matches(':hover') : node.contains(document.activeElement);
      if (isStillActive) {
        setOpen(true);
        onOpenChange?.({ open: true });
      }
    }, openDelay);
    return () => window.clearTimeout(timeoutId);
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (disabled || (disableOnMobile && isMobile)) return children;

  const defaultShowArrow = variant === 'popover' ? false : true;
  const showArrow = showArrowProp !== undefined ? showArrowProp : defaultShowArrow;

  const positioning = {
    ...rest.positioning,
    overflowPadding: 4,
    offset: {
      mainAxis: 4,
      ...rest.positioning?.offset,
    },
  };

  return (
    <ChakraTooltip.Root
      openDelay={ openDelay }
      // FIXME: chakra closes tooltip too fast, so Playwright is not able to make a screenshot of its content
      // so we need to increase the close delay in Playwright environment
      closeDelay={ config.app.isPw ? 10_000 : closeDelay }
      open={ open }
      onOpenChange={ handleOpenChange }
      closeOnClick={ false }
      closeOnPointerDown={ false }
      variant={ variant }
      lazyMount={ lazyMount }
      unmountOnExit={ unmountOnExit }
      interactive={ interactive }
      { ...rest }
      positioning={ positioning }
    >
      <ChakraTooltip.Trigger
        ref={ setTriggerRef }
        asChild
        onClick={ isMobile ? handleTriggerClick : undefined }
        { ...triggerProps }
      >
        { children }
      </ChakraTooltip.Trigger>
      <Portal disabled={ !portalled } container={ portalRef }>
        <ChakraTooltip.Positioner>
          <ChakraTooltip.Content
            ref={ innerRef }
            onClick={ interactive ? handleContentClick : undefined }
            { ...(selected ? { 'data-selected': true } : {}) }
            { ...contentProps }
          >
            { showArrow && (
              <ChakraTooltip.Arrow>
                <ChakraTooltip.ArrowTip/>
              </ChakraTooltip.Arrow>
            ) }
            { content }
          </ChakraTooltip.Content>
        </ChakraTooltip.Positioner>
      </Portal>
    </ChakraTooltip.Root>
  );
};

// A mounted ChakraTooltip.Root is a zag state machine plus several context providers, which
// dominates render time on tables with hundreds of closed tooltips. Until the first
// pointer/focus interaction only the bare trigger is rendered (with gesture-safe activation
// handlers, see useLazyActivation); the real tooltip is mounted on demand and opened manually.
// Once mounted (or opened externally) it stays mounted.
export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  function Tooltip({ eager, ...props }, ref) {
    const { activation, handlers, reset: resetActivation } = useLazyActivation();
    const isMountedRef = React.useRef(false);
    const isMobile = Boolean(useIsMobile());

    // controlled or default-open tooltips cannot defer mounting, nor can the ones whose
    // content must be in the DOM from the start (e.g. nav sub-links that crawlers should see)
    if (eager || (props.open ?? props.defaultOpen) || props.lazyMount === false) {
      isMountedRef.current = true;
    }

    const isDisabled = Boolean(props.disabled || (props.disableOnMobile && isMobile));

    // a disabled tooltip forgets its activation, otherwise re-enabling would replay it
    // (e.g. re-focus the trigger and steal focus from wherever the user went meanwhile)
    React.useEffect(() => {
      if (isDisabled) {
        isMountedRef.current = false;
        resetActivation();
      }
    }, [ isDisabled, resetActivation ]);

    if (isDisabled) {
      return props.children;
    }

    if (activation === null && !isMountedRef.current && React.isValidElement(props.children)) {
      const child = props.children as React.ReactElement<Record<string, unknown>>;

      const withOriginal = (name: keyof typeof handlers) => (event: never) => {
        const original = child.props[name];
        if (typeof original === 'function') {
          original(event);
        }
        handlers[name](event);
      };

      const lazyChild = React.cloneElement(child, {
        onPointerEnter: withOriginal('onPointerEnter'),
        onPointerDown: withOriginal('onPointerDown'),
        onPointerUp: withOriginal('onPointerUp'),
        onPointerCancel: withOriginal('onPointerCancel'),
        onFocus: withOriginal('onFocus'),
        onClick: withOriginal('onClick'),
      });

      // trigger style props (e.g. minW: 0) affect layout, so they must apply before activation too,
      // otherwise the first hover would shift the layout
      if (props.triggerProps) {
        const { asChild: _asChild, ...triggerStyleProps } = props.triggerProps;
        return <chakra.button asChild { ...triggerStyleProps }>{ lazyChild }</chakra.button>;
      }

      return lazyChild;
    }

    isMountedRef.current = true;
    return <TooltipImpl { ...props } innerRef={ ref } activation={ activation ?? undefined } isMobile={ isMobile }/>;
  },
);
