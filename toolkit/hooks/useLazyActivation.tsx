import * as React from 'react';
import { flushSync } from 'react-dom';

export interface LazyActivation {
  type: 'pointer' | 'focus';
  // whether the activating gesture included a click before the deferred mount happened
  // (e.g. a tap on a touch device) — lets the caller open the mounted trigger right away
  clicked: boolean;
  // child-index path from the trigger node down to the element that received focus; the swap
  // re-creates the whole subtree, so a focused descendant (button inside a container trigger)
  // has to be found again by position
  focusPath: Array<number>;
}

export function getNodePath(root: Node, target: Node | null): Array<number> {
  const path: Array<number> = [];
  let node = target;
  while (node && node !== root) {
    const parent: Node | null = node.parentNode;
    if (!parent) {
      return [];
    }
    path.unshift(Array.prototype.indexOf.call(parent.childNodes, node));
    node = parent;
  }
  return node === root ? path : [];
}

export function resolveNodePath(root: Node | null, path: Array<number>): Node | null {
  let node: Node | null | undefined = root;
  for (const index of path) {
    node = node?.childNodes[index];
  }
  return node ?? null;
}

interface Result {
  activation: LazyActivation | null;
  // forget the activation and any gesture state; the next interaction activates again
  reset: () => void;
  handlers: {
    onPointerEnter: (event: React.PointerEvent) => void;
    onPointerDown: (event: React.PointerEvent) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onFocus: (event: React.FocusEvent) => void;
    onClick: () => void;
  };
}

// If a touch gesture produces no click (long-press, text selection), the wrapper still has to
// mount eventually — this is the fallback delay counted from the finger lift.
const CLICKLESS_GESTURE_FALLBACK = 500;

// Tracks the first user interaction with a lazily mounted interactive wrapper (tooltip, popover)
// and reports it in a gesture-safe way. Mounting the wrapper swaps the trigger DOM node, and if
// that happens before the activating gesture has fully finished, the browser can lose the
// gesture's "click" (reproduced in iOS Safari: buttons wrapped in a lazy tooltip required
// a second tap). The tricky part is WebKit's tap event order — pointerup fires at touch-end,
// but the compatibility mousedown/mouseup/click sequence arrives in FOLLOW-UP tasks, so even
// a zero timeout scheduled at pointerup can swap the node before the click is synthesized.
// Hence the rule: during a touch gesture nothing is scheduled until the click handler itself
// (click is the last event of the sequence), with a delayed fallback for click-less gestures.
// Mouse hover and keyboard focus (no gesture in flight) activate right after the current task.
export function useLazyActivation(): Result {
  const [ activation, setActivation ] = React.useState<LazyActivation | null>(null);
  const typeRef = React.useRef<LazyActivation['type'] | null>(null);
  const clickedRef = React.useRef(false);
  const focusPathRef = React.useRef<Array<number>>([]);
  const isPressedRef = React.useRef(false);
  const isTouchGestureRef = React.useRef(false);
  const timeoutRef = React.useRef<number | null>(null);

  const cancel = React.useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const schedule = React.useCallback((delay: number) => {
    if (timeoutRef.current !== null) {
      return;
    }
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;

      // a press may have started after this was scheduled — mounting now would swap the
      // trigger node mid-gesture; the gesture's own click/pointerup will re-schedule
      if (isPressedRef.current) {
        return;
      }

      // Commit synchronously so the trigger swap happens atomically between input events.
      // Some ports (Linux WebKit) interleave scheduler tasks between the individual events
      // of a click sequence — an async commit can land between mousedown and mouseup, and
      // the browser then never synthesizes the click (its mousedown target is detached).
      flushSync(() => {
        setActivation((prev) => prev ?? { type: typeRef.current ?? 'pointer', clicked: clickedRef.current, focusPath: focusPathRef.current });
      });
    }, delay);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const reset = React.useCallback(() => {
    cancel();
    typeRef.current = null;
    clickedRef.current = false;
    focusPathRef.current = [];
    isPressedRef.current = false;
    isTouchGestureRef.current = false;
    setActivation(null);
  }, [ cancel ]);

  const handlers = React.useMemo(() => ({
    onPointerEnter: (event: React.PointerEvent) => {
      typeRef.current = typeRef.current ?? 'pointer';
      if (event.pointerType === 'mouse' && !isPressedRef.current) {
        schedule(0);
      } else if (event.pointerType !== 'mouse') {
        isTouchGestureRef.current = true;
      }
    },
    onPointerDown: (event: React.PointerEvent) => {
      isPressedRef.current = true;
      // the press can be released outside the trigger, where none of its handlers see the pointerup
      const release = () => {
        isPressedRef.current = false;
        document.removeEventListener('pointerup', release);
        document.removeEventListener('pointercancel', release);
      };
      document.addEventListener('pointerup', release);
      document.addEventListener('pointercancel', release);
      if (event.pointerType !== 'mouse') {
        isTouchGestureRef.current = true;
      }
      cancel();
    },
    onPointerUp: () => {
      isPressedRef.current = false;
      if (isTouchGestureRef.current) {
        schedule(CLICKLESS_GESTURE_FALLBACK);
      }
      // for the mouse, the click event that follows does the scheduling
    },
    onPointerCancel: () => {
      isPressedRef.current = false;
      isTouchGestureRef.current = false;
    },
    onFocus: (event: React.FocusEvent) => {
      if (typeRef.current === null) {
        typeRef.current = 'focus';
        focusPathRef.current = getNodePath(event.currentTarget, event.target as Node);
      }
      // during a press/touch gesture the focus event arrives mid-sequence — wait for the click
      if (!isPressedRef.current && !isTouchGestureRef.current) {
        schedule(0);
      }
    },
    onClick: () => {
      // the click is the last event of the gesture, so mounting after it is always safe
      clickedRef.current = true;
      isPressedRef.current = false;
      isTouchGestureRef.current = false;
      cancel();
      schedule(0);
    },
  }), [ schedule, cancel ]);

  return { activation, handlers, reset };
}
