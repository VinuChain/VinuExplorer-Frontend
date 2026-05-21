declare module 'react-identicons';
declare module 'use-font-face-observer';
declare module 'brotli-compress/js';
declare module '@multisender.app/multisender-react-widget';

// TS 6.0+ raises TS2882 for side-effect imports of style files unless the
// module is declared ambient. Pre-TS-6 those were implicitly resolved via
// next-env.d.ts; the type checker got stricter.
declare module '*.css';
declare module '*.scss';
declare module '*.sass';
