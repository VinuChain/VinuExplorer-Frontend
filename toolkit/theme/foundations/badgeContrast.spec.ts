import { describe, it, expect } from 'vitest';

import colors from './colors';
import semanticTokens from './semanticTokens';

// WCAG 2.1 AA floor for body text. Badge labels render at 14px / weight 500,
// under the 18.66px-bold threshold that would allow the relaxed 3:1 floor.
const AA_NORMAL_TEXT = 4.5;

const TOKEN_REF = /^\{colors\.(\w+)\.(\w+)\}$/;
const HEX = /^#[0-9a-f]{6}$/i;

function resolve(ref: string): string {
  const match = TOKEN_REF.exec(ref);

  if (!match) {
    throw new Error(`badge token ${ ref } is not a {colors.x.y} reference`);
  }

  const [ , palette, shade ] = match;
  const scale = (colors as unknown as Record<string, unknown>)[palette];
  const value = (scale as Record<string, { value?: unknown } | undefined> | undefined)?.[shade]?.value;

  if (typeof value !== 'string' || !HEX.test(value)) {
    throw new Error(`badge token ${ ref } does not resolve to a six-digit hex colour`);
  }

  return value;
}

// Separators are spelled as "comma with optional padding" OR "whitespace"
// rather than [,\s] wrapped in \s* - the padded and unpadded branches would
// otherwise match the same input two ways, which is a backtracking foothold.
const RGB = /^rgba?\(\s*(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})(?:\s*[,/]\s*([\d.]+))?\s*\)$/i;

function parseRgb(value: string): { hex: string; alpha: number } | null {
  const match = RGB.exec(value.trim());

  if (!match) {
    return null;
  }

  const [ , r, g, b, a ] = match;
  const channels = [ r, g, b ].map((channel) => Math.min(255, Number(channel)));

  if (channels.some((channel) => !Number.isFinite(channel))) {
    return null;
  }

  return {
    hex: `#${ channels.map((channel) => channel.toString(16).padStart(2, '0')).join('') }`,
    alpha: a === undefined ? 1 : Number(a),
  };
}

function relativeLuminance(hex: string): number {
  const [ r, g, b ] = [ 1, 3, 5 ]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const [ lighter, darker ] = [ relativeLuminance(a), relativeLuminance(b) ].sort((x, y) => y - x);

  return (lighter + 0.05) / (darker + 0.05);
}

type Pair = { value: { _light: string; _dark: string } };
type Entry = { bg: Pair; fg: Pair };
type BadgeGroup = Record<string, Entry | Record<string, Entry>>;

// Some foregrounds are alpha colours (blackAlpha/whiteAlpha). Compositing those
// needs the alpha channel, which the token value does not carry, so they are
// out of scope here; every opaque pair is covered.
function isOpaque(entry: Entry): boolean {
  return ![ entry.fg.value._light, entry.fg.value._dark, entry.bg.value._light, entry.bg.value._dark ]
    .some((ref) => ref.includes('Alpha'));
}

function flatten(group: BadgeGroup, prefix = ''): Array<[ string, Entry ]> {
  return Object.entries(group).flatMap(([ name, entry ]) => 'bg' in entry && 'fg' in entry ?
    [ [ `${ prefix }${ name }`, entry as Entry ] as [ string, Entry ] ] :
    flatten(entry as BadgeGroup, `${ prefix }${ name }.`));
}

const badge = (semanticTokens?.colors as Record<string, unknown> | undefined)?.badge as BadgeGroup;

type ModeValue = { value: string };
type ModePair = { _light: ModeValue; _dark: ModeValue };
const theme = (colors as unknown as { theme: { icon: { secondary: ModePair }; bg: { primary: ModePair } } }).theme;

const cases = flatten(badge)
  .filter(([ , entry ]) => isOpaque(entry))
  .flatMap(([ name, entry ]) => ([ '_light', '_dark' ] as const).map((mode) => {
    const fg = resolve(entry.fg.value[mode]);
    const bg = resolve(entry.bg.value[mode]);

    return { label: `badge.${ name } ${ mode }: ${ fg } on ${ bg }`, ratio: contrastRatio(fg, bg) };
  }));

describe('badge colour contrast', () => {
  // A palette added later inherits the same "mid-tone on near-white" habit that
  // put eight of the nine product palettes below the floor, so assert over
  // whatever is defined rather than over a list someone must remember to extend.
  it('covers every opaque badge palette in both modes', () => {
    expect(cases.length).toBeGreaterThanOrEqual(30);
  });

  it.each(cases)('$label meets WCAG AA', ({ ratio }) => {
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});

// WCAG 1.4.11 Non-text Contrast: 3:1 for graphics that carry meaning. axe does
// not test this for graphics, so the accessibility scans that found every text
// violation on this site reported nothing while icon.secondary sat at 2.26:1.
describe('icon colour contrast', () => {
  const AA_NON_TEXT = 3;

  // Three shapes reach here. bg.primary is a literal hex rather than a
  // {colors.x.y} reference - the file notes that colour links do not resolve in
  // that block. And NEXT_PUBLIC_COLOR_THEME_OVERRIDES is documented in rgba()
  // form, which the checked-in MegaETH preset uses, so a supported theme merges
  // values that are neither hex nor a token reference; without this the helper
  // handed them to resolve() and the suite threw before measuring anything,
  // failing a valid configuration on its input format rather than its contrast.
  const colour = (value: string): string | null => {
    if (HEX.test(value)) {
      return value;
    }

    const rgb = parseRgb(value);

    if (rgb) {
      // A translucent override would need compositing against whatever is
      // behind it, which the token does not carry - the same reason the alpha
      // badge palettes above are out of scope.
      return rgb.alpha === 1 ? rgb.hex : null;
    }

    return resolve(value);
  };

  it('parses the documented rgba override format', () => {
    expect(colour('rgba(16, 17, 18, 1)')).toBe('#101112');
    expect(colour('rgb(255, 0, 8)')).toBe('#ff0008');
    expect(colour('rgba(16, 17, 18, 0.5)')).toBeNull();
  });

  it.each([ '_light', '_dark' ] as const)('icon.secondary meets WCAG AA in %s mode', (mode) => {
    const icon = colour(theme.icon.secondary[mode].value);
    const background = colour(theme.bg.primary[mode].value);

    if (icon === null || background === null) {
      return;
    }

    expect(contrastRatio(icon, background)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});
