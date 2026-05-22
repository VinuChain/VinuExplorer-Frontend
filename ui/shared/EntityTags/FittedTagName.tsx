import { Box } from '@chakra-ui/react';
import React, { useLayoutEffect, useRef, useState } from 'react';

// Shrink-to-fit text renderer for tag labels. Long tag names (e.g.
// "VIR Ecosystem Wallet") in narrow rows would otherwise truncate
// with an ellipsis, losing brand-identity context. ResizeObserver +
// width measurement lets us scale the text down via CSS transform
// when the natural width exceeds the parent slot — preserving full
// legibility for moderate sizes (clamped at FITTED_MIN_SCALE) before
// falling back to ellipsis on extreme cases.
const FITTED_MIN_SCALE = 0.7;

interface Props {
  text?: string;
  // When provided, rendered via dangerouslySetInnerHTML (e.g. for
  // highlighted search-match markup). `text` is still required as the
  // re-measure key.
  html?: string;
}

const FittedTagName = React.memo(({ text, html }: Props) => {
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const innerRef = useRef<HTMLSpanElement | null>(null);
  const [ scale, setScale ] = useState<number>(1);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;

    const measure = () => {
      const containerWidth = wrapper.clientWidth;
      const textWidth = inner.scrollWidth;
      if (containerWidth <= 0 || textWidth <= 0) return;
      const next = textWidth > containerWidth ?
        Math.max(FITTED_MIN_SCALE, containerWidth / textWidth) :
        1;
      setScale((prev) => (Math.abs(prev - next) > 0.005 ? next : prev));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapper);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [ text, html ]);

  const willOverflow = scale <= FITTED_MIN_SCALE;

  const innerProps = html ?
    { dangerouslySetInnerHTML: { __html: html } } :
    {};

  // When `text` is provided and the inner content has been clamped
  // at FITTED_MIN_SCALE — meaning the label is being ellipsized —
  // expose the full label via the native `title` attribute as an
  // accessibility fallback. `EntityTagTooltip` only renders a tooltip
  // when popover metadata is present, so without this users had no
  // way to read the full tag name in extreme overflow cases.
  const fullTextTitle = !html && willOverflow && text ? text : undefined;

  return (
    <Box
      as="span"
      ref={ wrapperRef }
      display="block"
      overflow="hidden"
      minW={ 0 }
      lineHeight="1.25"
      title={ fullTextTitle }
    >
      <Box
        as="span"
        ref={ innerRef }
        display="inline-block"
        transform={ scale < 1 ? `scale(${ scale })` : undefined }
        transformOrigin="left center"
        whiteSpace="nowrap"
        overflow={ willOverflow ? 'hidden' : 'visible' }
        textOverflow={ willOverflow ? 'ellipsis' : 'clip' }
        maxW={ willOverflow ? '100%' : undefined }
        { ...innerProps }
      >
        { html ? null : text }
      </Box>
    </Box>
  );
});

FittedTagName.displayName = 'FittedTagName';

export default FittedTagName;
