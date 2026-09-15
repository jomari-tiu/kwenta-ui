import { cn } from '@/lib/utils';
import {
  formatPeso,
  formatPeso0,
  formatPesoNet,
  formatPesoSigned,
  type TCentavos,
} from '@/lib/money';

export type AmountTextProps = {
  centavos: TCentavos;
  /**
   * 'income' / 'expense' force the sign and colour by direction.
   * 'net' signs by value. 'plain' renders an unsigned magnitude.
   */
  kind?: 'income' | 'expense' | 'net' | 'plain';
  size?: 'sm' | 'md' | 'lg' | 'hero';
  /** Drop the decimals — for stat tiles and hero figures. */
  rounded?: boolean;
  className?: string;
};

const SIZES = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
  hero: 'text-3xl sm:text-4xl',
} as const;

/**
 * Money, with the sign always present.
 *
 * The +/- prefix is the colour-vision-deficiency fallback: a bare coloured
 * number is not readable under deuteranopia, so colour is never the only
 * channel carrying direction.
 *
 * Uses the `--ink-*` token family (WCAG 4.5:1 text contrast), NOT the
 * `--chart-*` marks family (3:1 mark contrast). Never mix them.
 */
export function AmountText({
  centavos,
  kind = 'plain',
  size = 'md',
  rounded = false,
  className,
}: AmountTextProps) {
  // The sign must survive rounding, so build it explicitly rather than falling
  // through to the unsigned formatter.
  const magnitude = rounded ? formatPeso0(centavos) : formatPeso(centavos);
  const text =
    kind === 'income'
      ? rounded
        ? `+${magnitude}`
        : formatPesoSigned(centavos, 'income')
      : kind === 'expense'
        ? rounded
          ? `−${magnitude}`
          : formatPesoSigned(centavos, 'expense')
        : kind === 'net'
          ? rounded
            ? signedRounded(centavos, magnitude)
            : formatPesoNet(centavos)
          : magnitude;

  const tone =
    kind === 'income'
      ? 'text-ink-income'
      : kind === 'expense'
        ? 'text-ink-expense'
        : kind === 'net'
          ? centavos > 0
            ? 'text-ink-income'
            : centavos < 0
              ? 'text-ink-expense'
              : 'text-text-muted'
          : 'text-text';

  return (
    <span
      className={cn(
        SIZES[size],
        tone,
        'font-semibold',
        // Tabular figures align money in columns; hero figures read better
        // proportional, since tabular gives every digit a zero's width.
        size === 'hero' ? 'tracking-tight' : 'tnum',
        className,
      )}
    >
      {text}
    </span>
  );
}

/** formatPeso0 already renders its own minus, so only add a leading plus. */
function signedRounded(centavos: TCentavos, magnitude: string): string {
  return centavos > 0 ? `+${magnitude}` : magnitude;
}
