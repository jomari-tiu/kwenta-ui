export type FormatNumberOptions = {
  thousandSeparator?: string;
  decimalSeparator?: string;
  precision?: number;
  prefix?: string;
  suffix?: string;
};

export function formatNumber(
  value: number,
  options: FormatNumberOptions = {},
): string {
  const {
    thousandSeparator = ',',
    decimalSeparator = '.',
    precision,
    prefix = '',
    suffix = '',
  } = options;

  const fixed =
    precision !== undefined ? value.toFixed(precision) : String(value);
  const [intPart, decPart] = fixed.split('.');

  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
  const result = decPart
    ? `${formatted}${decimalSeparator}${decPart}`
    : formatted;

  return `${prefix}${result}${suffix}`;
}

export function parseNumber(
  display: string,
  options: { thousandSeparator?: string; decimalSeparator?: string } = {},
): number | null {
  const { thousandSeparator = ',', decimalSeparator = '.' } = options;

  let cleaned = display.replace(/[^0-9-]/g, (char) => {
    if (char === decimalSeparator) return '.';
    if (char === thousandSeparator) return '';
    return '';
  });

  // Handle negative
  const isNegative = cleaned.startsWith('-');
  cleaned = cleaned.replace(/-/g, '');
  if (isNegative) cleaned = '-' + cleaned;

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
// NOTE: formatPeso / formatPeso0 deliberately DO NOT live here.
// The POS versions took PESOS; this app speaks integer CENTAVOS. Two
// same-named helpers 100x apart is a live money bug waiting for a
// copy-paste, so there is exactly one of each and they are in lib/money.ts.

/**
 * Format an ISO timestamp (or Date) as a short local date-time, e.g.
 * "Jul 9, 3:42 PM". Used by the sales list/receipts. Returns "" for bad input.
 */
export function formatDateTime(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Fit digits into a "###-###" style pattern. Used by NumberInput formatPattern.
 * NOTE: money does NOT go through here — see lib/money.ts.
 */
export function applyPattern(value: string, pattern: string): string {
  const digits = value.replace(/D/g, '');
  let result = '';
  let digitIndex = 0;

  for (let i = 0; i < pattern.length && digitIndex < digits.length; i++) {
    if (pattern[i] === '#') {
      result += digits[digitIndex];
      digitIndex++;
    } else {
      result += pattern[i];
    }
  }
  return result;
}
