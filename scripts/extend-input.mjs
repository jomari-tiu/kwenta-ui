/**
 * Extend the ported DS Input with what a finance app needs.
 *
 * The POS Input only allowed text-ish types and had no mobile keyboard hints.
 * This app needs `type="date"` for plain-date fields and `inputMode="numeric"`
 * for month/day counts, and `size="lg"` (16px) is a hard requirement on mobile
 * because anything smaller triggers an un-reversible viewport zoom on iOS.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'src/components/ds/Input.tsx';
let s = readFileSync(file, 'utf8');

s = s.replace(
  `  type?: "text" | "email" | "password" | "url" | "tel" | "search";`,
  `  type?:
    | "text"
    | "email"
    | "password"
    | "url"
    | "tel"
    | "search"
    | "date"
    | "month"
    | "number";
  /** Mobile keyboard hint. Prefer this over type="number" for amounts. */
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  enterKeyHint?: React.HTMLAttributes<HTMLInputElement>["enterKeyHint"];
  min?: string | number;
  max?: string | number;
  step?: string | number;`,
);

s = s.replace(
  `  autoFocus,
  maxLength,
  className,
}: InputProps) {`,
  `  autoFocus,
  maxLength,
  inputMode,
  autoComplete,
  enterKeyHint,
  min,
  max,
  step,
  className,
}: InputProps) {`,
);

s = s.replace(
  `          autoFocus={autoFocus}
          maxLength={maxLength}
          aria-invalid={!!error}`,
  `          autoFocus={autoFocus}
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete={autoComplete}
          enterKeyHint={enterKeyHint}
          min={min}
          max={max}
          step={step}
          aria-invalid={!!error}`,
);

writeFileSync(file, s);
console.log('Input extended');
