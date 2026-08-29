import { readFileSync, readdirSync } from 'node:fs';

/**
 * Confirms the stacking scale actually compiled into the CSS. Arbitrary Tailwind
 * values like z-[1000] only exist if a source file references them, so a typo
 * silently produces no z-index at all — worth asserting rather than assuming.
 */
const dir = 'dist/assets';
const css = readdirSync(dir).filter(
  (f) => f.startsWith('index-') && f.endsWith('.css'),
)[0];
const s = readFileSync(`${dir}/${css}`, 'utf8');

const checks = [
  ['sheet / drawer surface', '.z-50{z-index:50}'],
  ['dialog surface', '.z-\\[900\\]{z-index:900}'],
  ['select + popover popup', '.z-\\[1000\\]{z-index:1000}'],
  ['tooltip', '.z-\\[1100\\]{z-index:1100}'],
];

let pass = 0;
for (const [label, needle] of checks) {
  const ok = s.includes(needle);
  if (ok) pass += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(24)} ${needle}`);
}

const zi = [...new Set(s.match(/z-index:\d+/g) ?? [])]
  .map((v) => Number(v.split(':')[1]))
  .sort((a, b) => a - b);
console.log(`\n${pass}/${checks.length} layers compiled`);
console.log('all z-index values in CSS:', zi.join(' < '));
