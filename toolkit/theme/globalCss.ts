import type { SystemConfig } from '@chakra-ui/react';

import addressEntity from './globals/address-entity';
import entity from './globals/entity';
import recaptcha from './globals/recaptcha';
import scrollbar from './globals/scrollbar';

const webkitAutofillOverrides = {
  WebkitTextFillColor: 'var(--chakra-colors-input-fg)',
  '-webkit-box-shadow': '0 0 0px 1000px var(--chakra-colors-input-bg) inset',
  transition: 'background-color 5000s ease-in-out 0s',
};

const webkitAutofillRules = {
  '&:-webkit-autofill': webkitAutofillOverrides,
  '&:-webkit-autofill:hover': webkitAutofillOverrides,
  '&:-webkit-autofill:focus': webkitAutofillOverrides,
};

const globalCss: SystemConfig['globalCss'] = {
  body: {
    bg: 'global.body.bg',
    color: 'global.body.fg',
    WebkitTapHighlightColor: 'transparent',
    fontVariantLigatures: 'no-contextual',
  },
  // `body` used to set `focusRingStyle: 'hidden'`, which resolves Chakra's
  // `--focus-ring-style` to `hidden` for every component that draws a ring.
  // Keyboard users got no visible focus indicator anywhere - a WCAG 2.4.7
  // (Focus Visible, AA) failure axe cannot detect, because it does not
  // evaluate focus styles.
  //
  // A `*:focus-visible` rule alone did NOT fix it, which is worth recording:
  // the elements matched `:focus-visible` and still computed
  // `outline: none 0px`, because each component's own rule carries higher
  // specificity than the universal selector and resolved the ring to
  // `hidden`. Measured on the deployed site, four of the first five tab stops
  // were still invisible; only a plain anchor with no Chakra rule picked the
  // floor up.
  //
  // Removing the token is the fix: Chakra's own ring returns, and it is
  // mode-aware - measured `rgb(26, 32, 44)` on light and `rgb(226, 232, 240)`
  // on dark, both 2px with a 2px offset. The rule below stays as the floor
  // for anything Chakra does not style itself.
  '*:focus-visible': {
    outline: '2px solid',
    outlineColor: { _light: 'blue.600', _dark: 'blue.300' },
    outlineOffset: '2px',
  },
  mark: {
    bg: 'global.mark.bg',
    color: 'inherit',
  },
  'svg *::selection': {
    color: 'none',
    background: 'none',
  },
  form: {
    w: '100%',
  },
  input: {
    // hide number input arrows in Google Chrome
    '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
      WebkitAppearance: 'none',
      margin: 0,
    },
    ...webkitAutofillRules,
  },
  textarea: {
    ...webkitAutofillRules,
  },
  select: {
    ...webkitAutofillRules,
  },
  // Nothing in the app consults prefers-reduced-motion, so a user who has asked
  // their OS to reduce motion still gets every transition, the infinite
  // skeleton pulse, and smooth scrolling. Vestibular triggers are the reason
  // that setting exists, so honour it as a global floor rather than per
  // component. Durations are collapsed rather than set to 0 so animation and
  // transition end events still fire and nothing waiting on them stalls.
  '*, *::before, *::after': {
    '@media (prefers-reduced-motion: reduce)': {
      animationDuration: '0.01ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0.01ms !important',
      scrollBehavior: 'auto !important',
    },
  },
  ...recaptcha,
  ...scrollbar,
  ...entity,
  ...addressEntity,
};

export default globalCss;
