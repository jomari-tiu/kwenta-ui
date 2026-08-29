/**
 * Second pass over the ported design system: drop the pieces that only made
 * sense in the POS app, and remove imports the Vite/JSX-runtime setup no longer
 * needs.
 */
import { readFileSync, writeFileSync } from 'node:fs';

function edit(file, fn) {
  const before = readFileSync(file, 'utf8');
  const after = fn(before);
  if (after !== before) {
    writeFileSync(file, after);
    console.log(`patched ${file}`);
  } else {
    console.log(`NO CHANGE ${file}`);
  }
}

// `jsx: react-jsx` means the React namespace import is unnecessary, and
// noUnusedLocals rejects it.
for (const f of [
  'src/components/ds/ProgressBar.tsx',
  'src/components/ds/Radio.tsx',
  'src/components/ui/scroll-area.tsx',
]) {
  edit(f, (s) =>
    s.replace(/^import \* as React from ['"]react['"];?\r?\n/m, ''),
  );
}

// EmptyState: the POS mascot illustration has no place here.
edit('src/components/ds/EmptyState.tsx', (s) =>
  s
    .replace(/^import \{ Mascot \} from ['"]\.\/Mascot['"];?\r?\n/m, '')
    .replace(/^\s*hideMascot\?: boolean;\r?\n/m, '')
    .replace(/^\s*hideMascot,\r?\n/m, '')
    .replace(
      /\) : \(\s*\r?\n\s*!hideMascot && <Mascot size=\{92\} className="mb-2 opacity-95" \/>\s*\r?\n\s*\)\}/,
      ') : null}',
    ),
);

// useFormFields: FormMaskInput (POS phone/TIN masks) and FormAsyncSelect
// (paginated relation picker) are both dropped — 25 categories and 8 accounts
// fit in a plain FormSelect.
edit('src/components/ds/form/useFormFields.ts', (s) =>
  s
    .replace(
      /^import \{ FormMaskInput, type FormMaskInputProps \} from ['"]\.\/FormMaskInput['"];?\r?\n/m,
      '',
    )
    .replace(
      /^import \{ FormAsyncSelect, type FormAsyncSelectProps \} from ['"]\.\/FormAsyncSelect['"];?\r?\n/m,
      '',
    )
    .replace(
      /^\s*FormMaskInput: FormMaskInput as unknown as TypedComponent<FormMaskInputProps<T>>,\r?\n/m,
      '',
    )
    .replace(
      /^\s*FormAsyncSelect: FormAsyncSelect as unknown as TypedComponent<\r?\n\s*FormAsyncSelectProps<T>\r?\n\s*>,\r?\n/m,
      '',
    ),
);
