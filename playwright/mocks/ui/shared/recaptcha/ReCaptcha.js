import React from 'react';

// The real component renders react-google-recaptcha with the site key from
// playwright/envs.js, which is the literal "xxx". Google rejects it, onErrored
// fires and the component renders a warning alert - so whether that alert is in
// a screenshot depends on whether a network round trip to Google beat the
// capture. That is a network dependency, and a race, inside a component test.
//
// PublicTagsSubmitForm.pw.tsx already works around it with a MutationObserver
// that hides the alert whenever it appears; this is the same fix applied once
// for every test rather than in one file.
//
// Rendering nothing matches what a working reCAPTCHA looks like here: every
// call site uses size="invisible", whose only DOM output is the
// .grecaptcha-badge that global CSS already hides. The hook this component
// pairs with, useReCaptcha, is mocked alongside it.
const ReCaptcha = React.forwardRef(() => null);

ReCaptcha.displayName = 'ReCaptchaMock';

export default ReCaptcha;
