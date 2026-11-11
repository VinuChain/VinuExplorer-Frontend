// this component trims hash string like 0x123...4567 (always 4 chars after dots)
// or shows full hash string, if fits

// i can't do this with pure css. if you can, feel free to replace it

// if i use <span text-overflow=ellipsis>some chars</span><span>last 4 chars</span>
// i have an unremovable gap between dots and second span

// so i did it with js

import type { BoxProps } from '@chakra-ui/react';
import { chakra } from '@chakra-ui/react';
import { debounce } from 'es-toolkit';
import React, { useCallback, useEffect, useRef } from 'react';
import type { FontFace } from 'use-font-face-observer';
import useFontFaceObserver from 'use-font-face-observer';

import { Tooltip } from 'toolkit/chakra/tooltip';
import { BODY_TYPEFACE, HEADING_TYPEFACE } from 'toolkit/theme/foundations/typography';

const TAIL_LENGTH = 4;
const HEAD_MIN_LENGTH = 4;

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
    let parentWidth = parent.getBoundingClientRect().width;

    // hidden parent (width 0) or no canvas: keep the full hash, same as the old DOM-based measurement did
    if (!measure || !parentWidth) {
      setDisplayedString(hash);
      return;
    }

    const hashWidth = measure(hash);
    if (hashWidth > parentWidth) {
      // a parent sized by its content (for example an already shortened hash) grows when the full hash is added,
      // and the old measurement judged the fit against that grown width. This is the only DOM write and costs
      // one layout; it is skipped whenever the hash already fits.
      const shadowEl = document.createElement('span');
      shadowEl.style.opacity = '0';
      shadowEl.textContent = hash;
      parent.appendChild(shadowEl);
      parentWidth = parent.getBoundingClientRect().width;
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
    return function cleanup() {
      window.removeEventListener('resize', resizeHandler);
    };
  }, [ calculateString ]);

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

  // the app turns contextual alternates off (globalCss) but a canvas cannot, and Inter turns the x in "0x0" into a wider
  // "×"; measuring the "0x" prefix on its own keeps that alternate away
  const noContextual = style.fontVariantLigatures.includes('no-contextual');
  const width = (text: string) => ctx.measureText(text).width;

  return (text: string) => (noContextual && text.startsWith('0x') ? width('0x') + width(text.slice(2)) : width(text)) + letterSpacing * text.length;
}

export default React.memo(HashStringShortenDynamic);
