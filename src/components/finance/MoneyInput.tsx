import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { centavosToInputString, parsePesoInput } from '@/lib/money';

export type MoneyInputProps = {
  /** The committed value as a STRING, matching the POS NumberInput contract. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  className?: string;
  'aria-describedby'?: string;
};

function groupIntegerPart(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * A peso amount field.
 *
 * Deliberate choices, each of which is a real papercut otherwise:
 *  - `inputMode="decimal"`, NOT `type="number"`: no spinner arrows, no
 *    scroll-wheel value changes, no locale ambiguity between . and ,
 *  - `text-base` (16px): anything smaller triggers an UN-REVERSIBLE viewport
 *    zoom on iOS Safari when the field is focused.
 *  - Thousands are grouped live, but the value is only normalised to 2 decimals
 *    ON BLUR. Formatting decimals while typing rewrites the field mid-keystroke
 *    and the caret jumps past the end when you type "1", ".", "5".
 */
export function MoneyInput({
  value,
  onChange,
  onBlur,
  placeholder = '0.00',
  disabled,
  invalid,
  autoFocus,
  id,
  name,
  className,
  ...rest
}: MoneyInputProps) {
  const [display, setDisplay] = useState(() => formatForDisplay(value));
  const isEditing = useRef(false);

  // Keep the display in sync when the form resets or hydrates an edit.
  useEffect(() => {
    if (!isEditing.current) setDisplay(formatForDisplay(value));
  }, [value]);

  function handleChange(raw: string) {
    isEditing.current = true;

    // Keep only digits and at most one dot, then group the integer part.
    const cleaned = raw.replace(/[^\d.]/g, '');
    const firstDot = cleaned.indexOf('.');
    const normalised =
      firstDot === -1
        ? cleaned
        : `${cleaned.slice(0, firstDot)}.${cleaned
            .slice(firstDot + 1)
            .replace(/\./g, '')
            .slice(0, 2)}`;

    const [intPart = '', fracPart] = normalised.split('.');
    const shown =
      fracPart === undefined
        ? groupIntegerPart(intPart)
        : `${groupIntegerPart(intPart)}.${fracPart}`;

    setDisplay(shown);
    onChange(normalised);
  }

  function handleBlur() {
    isEditing.current = false;
    const centavos = parsePesoInput(display);
    if (centavos === null) {
      setDisplay('');
      onChange('');
    } else {
      const canonical = centavosToInputString(centavos);
      setDisplay(formatForDisplay(canonical));
      onChange(canonical);
    }
    onBlur?.();
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-md border bg-card px-3 transition-colors',
        'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/25',
        invalid && 'border-destructive focus-within:border-destructive',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <span className="text-text-muted select-none">₱</span>
      <input
        id={id}
        name={name}
        // NOT type="number" — see the comment above.
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        value={display}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        aria-invalid={invalid || undefined}
        // text-base is a hard requirement on mobile, not a preference.
        className="tnum h-11 w-full bg-transparent text-right text-base outline-none placeholder:text-text-faint"
        {...rest}
      />
    </div>
  );
}

function formatForDisplay(raw: string): string {
  if (!raw) return '';
  const centavos = parsePesoInput(raw);
  if (centavos === null) return raw;
  const canonical = centavosToInputString(centavos);
  const [intPart = '0', fracPart = '00'] = canonical.split('.');
  const negative = intPart.startsWith('-');
  const digits = negative ? intPart.slice(1) : intPart;
  return `${negative ? '-' : ''}${groupIntegerPart(digits)}.${fracPart}`;
}
