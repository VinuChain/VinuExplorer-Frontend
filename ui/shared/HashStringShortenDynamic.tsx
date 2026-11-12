// this component trims hash string like 0x123...4567 (always 4 chars after dots)
// or shows full hash string, if fits

// i can't do this with pure css. if you can, feel free to replace it

// if i use <span text-overflow=ellipsis>some chars</span><span>last 4 chars</span>
// i have an unremovable gap between dots and second span

// so i did it with js

import type { BoxProps } from '@chakra-ui/react';
import { chakra } from '@chakra-ui/react';
import { debounce } from 'es-toolkit';
import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { FontFace } from 'use-font-face-observer';
import useFontFaceObserver from 'use-font-face-observer';

import { Tooltip } from 'toolkit/chakra/tooltip';
import { BODY_TYPEFACE, HEADING_TYPEFACE } from 'toolkit/theme/foundations/typography';

const TAIL_LENGTH = 4;
const HEAD_MIN_LENGTH = 4;
const MAX_VERIFY_STEPS = 3;

interface Props extends BoxProps {
  hash: string;
  fontWeight?: string | number;
  noTooltip?: boolean;
  tooltipInteractive?: boolean;
  tailLength?: number;
  as?: React.ElementType;
}

const HashStringShortenDynamic = ({ hash, fontWeight = '400', noTooltip, tailLength = TAIL_LENGTH, as = 'span', tooltipInteractive, ...props }: Props) => {
  const elementRef = useRef<HTMLSpanElement>(null);
  const [ displayedString, setDisplayedString ] = React.useState(hash ?? '');
  const [ calcId, setCalcId ] = React.useState(0);
  const verifySteps = useRef(0);

  const isFontFaceLoaded = useFontFaceObserver([
    { family: BODY_TYPEFACE, weight: String(fontWeight) as FontFace['weight'] },
    { family: HEADING_TYPEFACE, weight: String(fontWeight) as FontFace['weight'] },
  ]);

  const calculateString = useCallback(() => {
    const parent = elementRef?.current?.parentNode as HTMLElement;
    if (!parent) {
      return;
    }

    const measure = getMeasurer(parent);
    let parentWidth = getUntransformedWidth(parent);

    verifySteps.current = 0;
    setCalcId((id) => id + 1);

    // no canvas (SSR, jsdom): keep the full hash
    if (!measure) {
      setDisplayedString(hash);
      return;
    }

    // a hidden parent (width 0) falls through to the search and gets the shortest form, same as the old DOM-based measurement
    const hashWidth = measure(hash);
    if (hashWidth > parentWidth) {
      // a parent sized by its content (for example an already shortened hash) grows when the full hash is added,
      // and the old measurement judged the fit against that grown width. This is the only DOM write and costs
      // one layout; it is skipped whenever the hash already fits.
      const shadowEl = document.createElement('span');
      shadowEl.style.opacity = '0';
      shadowEl.textContent = hash;
      parent.appendChild(shadowEl);
      parentWidth = getUntransformedWidth(parent);
      parent.removeChild(shadowEl);
    }

    if (hashWidth <= parentWidth) {
      setDisplayedString(hash);
      return;
    }

    const tail = hash.slice(-tailLength);
    let leftI = HEAD_MIN_LENGTH;
    let rightI = hash.length - tailLength;

    while (rightI - leftI > 1) {
      const medI = ((rightI - leftI) % 2) ? leftI + (rightI - leftI + 1) / 2 : leftI + (rightI - leftI) / 2;
      const res = hash.slice(0, medI) + '...' + tail;
      if (measure(res) < parentWidth) {
        leftI = medI;
      } else {
        rightI = medI;
      }
    }
    setDisplayedString(hash.slice(0, rightI - 1) + '...' + tail);
  }, [ hash, tailLength ]);

  // we want to do recalculation when isFontFaceLoaded flag is changed
  // but we don't want to create more resize event listeners
  // that's why there are separate useEffect hooks
  useEffect(() => {
    calculateString();
  }, [ calculateString, isFontFaceLoaded ]);

  useEffect(() => {
    const resizeHandler = debounce(calculateString, 100);

    window.addEventListener('resize', resizeHandler);
    // the font weight in use may differ from the one useFontFaceObserver waits for
    document.fonts?.addEventListener?.('loadingdone', calculateString);
    return function cleanup() {
      window.removeEventListener('resize', resizeHandler);
      document.fonts?.removeEventListener?.('loadingdone', calculateString);
    };
  }, [ calculateString ]);

  // canvas widths can still differ from the rendered text (fonts, rounding), so check the real width once per commit.
  // Only reads happen here, so all instances of a commit share one layout; clipping the tail is the worst outcome
  // for a hash, so on overflow cut one more head char (bounded)
  useLayoutEffect(() => {
    const el = elementRef.current;
    const parent = el?.parentNode as HTMLElement | null;
    if (!el || !parent || verifySteps.current >= MAX_VERIFY_STEPS) {
      return;
    }
    const parentWidth = getUntransformedWidth(parent);
    const elWidth = el.getBoundingClientRect().width;
    const layoutWidth = el.offsetWidth;
    const width = layoutWidth > 0 && Math.abs(elWidth - layoutWidth) > 1 ? layoutWidth : elWidth;
    if (!parentWidth || width <= parentWidth) {
      return;
    }
    const head = displayedString.endsWith('...' + hash.slice(-tailLength)) && displayedString.length < hash.length ?
      displayedString.length - 3 - tailLength :
      hash.length - tailLength - 3; // a full hash that overflows: the first shortened form is 1 char shorter
    if (head <= HEAD_MIN_LENGTH) {
      return;
    }
    verifySteps.current++;
    setDisplayedString(hash.slice(0, head - 1) + '...' + hash.slice(-tailLength));
  }, [ displayedString, calcId, hash, tailLength ]);

  if (!hash) {
    return null;
  }

  const content = <chakra.span ref={ elementRef } as={ as } { ...props }>{ displayedString }</chakra.span>;
  const isTruncated = hash.length !== displayedString.length;

  if (isTruncated && !noTooltip) {
    return (
      <Tooltip
        content={ hash }
        contentProps={{ maxW: { base: 'calc(100vw - 8px)', lg: '400px' } }}
        interactive={ tooltipInteractive }
      >
        { content }
      </Tooltip>
    );
  }

  return content;
};

let canvasContext: CanvasRenderingContext2D | null | undefined;

// returns a text width function in the parent's font, or null when there is no canvas (SSR, jsdom)
// measuring on a canvas does not touch the DOM, so it never forces a layout
function getMeasurer(parent: HTMLElement) {
  if (canvasContext === undefined) {
    try {
      canvasContext = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
    } catch {
      canvasContext = null;
    }
  }
  const ctx = canvasContext;
  if (!ctx) {
    return null;
  }

  const style = getComputedStyle(parent);
  ctx.font = `${ style.fontStyle } ${ style.fontWeight } ${ style.fontSize } ${ style.fontFamily }`;
  const letterSpacing = parseFloat(style.letterSpacing) || 0; // 'normal' parses to NaN

  // the app turns contextual alternates off (globalCss) but a canvas cannot, and Inter turns the x in any digit-x-digit
  // run into a wider "×". Cutting the text on both sides of every x that touches a digit keeps that alternate away,
  // while the rest stays in one piece so kerning (and the sub-pixel fit decisions that depend on it) is unchanged
  const width = (text: string) => ctx.measureText(text).width;
  const segmentedWidth = (text: string) => text.split(/(?<=\d)(?=x)|(?<=x)(?=\d)/).reduce((sum, piece) => sum + width(piece), 0);
  const noContextual = style.fontVariantLigatures.includes('no-contextual');

  return (text: string) => (noContextual ? segmentedWidth(text) : width(text)) + letterSpacing * text.length;
}

// getBoundingClientRect includes css transforms (for example a popover scaling in), canvas widths do not
function getUntransformedWidth(el: HTMLElement) {
  const { width } = el.getBoundingClientRect();
  const layoutWidth = el.offsetWidth;
  return layoutWidth > 0 && Math.abs(width - layoutWidth) > 1 ? layoutWidth : width; // width / (width / layoutWidth)
}

export default React.memo(HashStringShortenDynamic);
