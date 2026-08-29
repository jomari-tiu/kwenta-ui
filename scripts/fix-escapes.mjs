import { readFileSync, writeFileSync } from 'node:fs';

/**
 * A trailing `-` inside a character class needs no backslash, and eslint's
 * no-useless-escape flags it. Fixed here rather than inline because the shell
 * keeps eating the backslash.
 */
const targets = [
  ['src/components/ds/NumberInput.tsx', '[^0-9.\\-]', '[^0-9.-]'],
  ['src/lib/format.ts', '[^0-9\\-]', '[^0-9-]'],
];

for (const [file, from, to] of targets) {
  const before = readFileSync(file, 'utf8');
  const after = before.split(from).join(to);
  if (after === before) {
    console.warn(`NO CHANGE ${file} (looked for ${from})`);
  } else {
    writeFileSync(file, after);
    console.log(`fixed ${file}`);
  }
}
