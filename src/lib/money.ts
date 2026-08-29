/**
 * Money is INTEGER CENTAVOS everywhere. 12345 === PHP 123.45.
 *
 * There is exactly one `formatPeso` in this repo and it lives here, taking
 * centavos. Do NOT copy the one from sqrly-cfe/lib/format.ts — same name, 100x
 * different meaning, and it would render plausibly wrong.
 */
export type TCentavos = number;

const PESO = '₱';
/** U+2212 MINUS SIGN, not a hyphen. Renders as a proper minus at any weight. */
const MINUS = '−';

function group(value: number, fractionDigits: number): string {
  return value.toLocaleString('en-PH', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** "PHP 1,234.50" — rows, tables, day panel, tooltips. */
export function formatPeso(centavos: TCentavos): string {
  const negative = centavos < 0;
  const body = `${PESO}${group(Math.abs(centavos) / 100, 2)}`;
  return negative ? `${MINUS}${body}` : body;
}

/** "PHP 1,235" — stat tiles and hero figures, where decimals are noise. */
export function formatPeso0(centavos: TCentavos): string {
  const negative = centavos < 0;
  const body = `${PESO}${group(Math.round(Math.abs(centavos) / 100), 0)}`;
  return negative ? `${MINUS}${body}` : body;
}

/** "PHP 1.2k" / "PHP 3.4M" — chart axis ticks and bar labels only. */
export function formatPesoCompact(centavos: TCentavos): string {
  const negative = centavos < 0;
  const pesos = Math.abs(centavos) / 100;

  let body: string;
  if (pesos >= 1_000_000) {
    body = `${PESO}${trimZero(pesos / 1_000_000)}M`;
  } else if (pesos >= 1_000) {
    body = `${PESO}${trimZero(pesos / 1_000)}k`;
  } else {
    body = `${PESO}${Math.round(pesos)}`;
  }
  return negative ? `${MINUS}${body}` : body;
}

function trimZero(n: number): string {
  const s = n.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

/**
 * "+PHP 1,200.00" / "-PHP 340.00".
 *
 * The sign prefix is the colour-vision-deficiency fallback: never render a bare
 * coloured number for an income/expense amount.
 */
export function formatPesoSigned(
  centavos: TCentavos,
  kind: 'income' | 'expense',
): string {
  const magnitude = `${PESO}${group(Math.abs(centavos) / 100, 2)}`;
  return kind === 'income' ? `+${magnitude}` : `${MINUS}${magnitude}`;
}

/** Signed by value rather than by kind — for net figures. */
export function formatPesoNet(centavos: TCentavos): string {
  const magnitude = `${PESO}${group(Math.abs(centavos) / 100, 2)}`;
  if (centavos > 0) return `+${magnitude}`;
  if (centavos < 0) return `${MINUS}${magnitude}`;
  return magnitude;
}

/**
 * Parse user input into centavos. Returns null when unparseable.
 *
 * Parses TEXTUALLY rather than multiplying by 100, because
 * `parseFloat('8.165') * 100` is 816.5000000000001 and for other values the
 * float error rounds the wrong way.
 *
 * A third decimal TRUNCATES ('8.169' -> 816): silently rounding a centavo up is
 * worse than dropping one you cannot spend.
 */
export function parsePesoInput(input: string): TCentavos | null {
  if (typeof input !== 'string') return null;

  const cleaned = input
    .replace(/[₱\s,]/g, '')
    .replace(/^\+/, '')
    .replace(/−/g, '-');

  if (cleaned === '' || cleaned === '.' || cleaned === '-') return null;
  if (!/^-?\d*(\.\d*)?$/.test(cleaned)) return null;

  const negative = cleaned.startsWith('-');
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const [intPart = '', fracPart = ''] = unsigned.split('.');

  const whole = intPart === '' ? 0 : Number(intPart);
  const frac = Number(fracPart.padEnd(2, '0').slice(0, 2));
  if (!Number.isFinite(whole) || !Number.isFinite(frac)) return null;

  const total = whole * 100 + frac;
  return negative ? -total : total;
}

/** 123450 -> "1234.50". For hydrating an edit form. */
export function centavosToInputString(centavos: TCentavos): string {
  const negative = centavos < 0;
  const abs = Math.abs(centavos);
  const body = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
  return negative ? `-${body}` : body;
}

/** Exact integer sum. Reads as intent rather than a bare reduce. */
export function sumCentavos(values: TCentavos[]): TCentavos {
  return values.reduce((a, b) => a + b, 0);
}
