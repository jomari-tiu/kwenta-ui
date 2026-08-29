// Pure hex-colour helpers for deriving palette shades. No dependencies.
// Used by the brand-theme system to turn a single picked colour into the
// -600 / -tint / -light shades the design tokens expect.

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

type RGB = [number, number, number];

/** Normalise any accepted hex (`abc`, `#abc`, `AABBCC`) to `#aabbcc`, or null. */
export function normalizeHex(input: string): string | null {
  const match = input.trim().match(HEX_RE);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return `#${hex.toLowerCase()}`;
}

function toRgb(hex: string): RGB {
  const norm = normalizeHex(hex) ?? '#000000';
  const int = parseInt(norm.slice(1), 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function toHex([r, g, b]: RGB): string {
  const channel = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

// Mix a colour toward a target RGB by `amount` (0..1).
function mix(hex: string, target: RGB, amount: number): string {
  const [r, g, b] = toRgb(hex);
  const t = Math.max(0, Math.min(1, amount));
  return toHex([
    r + (target[0] - r) * t,
    g + (target[1] - g) * t,
    b + (target[2] - b) * t,
  ]);
}

/** Darken toward black by `amount` (0..1). */
export function shade(hex: string, amount: number): string {
  return mix(hex, [0, 0, 0], amount);
}

/** Lighten toward white by `amount` (0..1). */
export function tint(hex: string, amount: number): string {
  return mix(hex, [255, 255, 255], amount);
}

/** Blend `a` toward `b` by `amount` (0..1). Used to derive the surface/text/border
 *  stack from a base colour so the ramp stays coherent in light and dark alike. */
export function mixHex(a: string, b: string, amount: number): string {
  return mix(a, toRgb(b), amount);
}

/**
 * `hex` at `alpha` (0..1) as an 8-digit `#rrggbbaa`.
 *
 * Preferred over `color-mix(… transparent)` for values baked into a custom
 * property: Lightning CSS emits a fully-opaque fallback for engines without
 * `color-mix`, which turns a soft glow into a hard halo. 8-digit hex has no
 * such fallback problem.
 */
export function withAlpha(hex: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const suffix = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
  const [r, g, b] = toRgb(hex);
  const channel = (c: number) => c.toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}${suffix}`;
}

// --- WCAG contrast (for the readability guardrail) ---

/** Relative luminance per WCAG 2.1. */
function luminance(hex: string): number {
  const srgb = toRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/** WCAG contrast ratio between two colours (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white — whichever reads better on `bg`. */
export function readableOn(bg: string): string {
  return contrastRatio('#ffffff', bg) >= contrastRatio('#000000', bg)
    ? '#ffffff'
    : '#111827';
}
