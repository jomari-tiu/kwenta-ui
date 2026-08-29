/**
 * Split every `@/components/ds` barrel import into direct imports.
 *
 * Mechanical only: names whose API is unchanged get re-pointed at
 * `@/components/ui/*`, `sonner`, or `@/components/finance`. Names whose API
 * genuinely differs (Dialog, Drawer, Select, Input, Badge, Switch,
 * SegmentedControl, Form*) are reported and left for a hand rewrite, because a
 * blind rename there would compile and behave wrong.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

/** name -> module it now comes from */
const DIRECT = {
  // unchanged API
  Skeleton: '@/components/ui/skeleton',
  Button: '@/components/ui/button',
  Card: '@/components/ui/card',
  Tooltip: '@/components/ui/tooltip',
  toast: 'sonner',
  // app-specific, relocated
  AmountText: '@/components/finance',
  MoneyInput: '@/components/finance',
  Meter: '@/components/finance',
  ChartFrame: '@/components/finance',
  RankedBarList: '@/components/finance',
  ConfirmDialog: '@/components/finance',
  EmptyState: '@/components/finance',
  ErrorState: '@/components/finance',
};

/** Needs a hand rewrite — API differs. */
const MANUAL = new Set([
  'Dialog',
  'Drawer',
  'Select',
  'Input',
  'Badge',
  'Switch',
  'SegmentedControl',
  'Tabs',
  'Table',
  'FormWrapper',
  'FormInput',
  'FormSelect',
  'FormMoneyInput',
  'FormSwitch',
  'FormNumberInput',
  'FormDatePicker',
  'FormCheckbox',
  'FormRadio',
  'useFormFields',
]);

const files = execSync(
  'grep -rl "@/components/ds" src --include=*.ts --include=*.tsx',
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean)
  .filter((f) => !f.startsWith('src/components/ds/'));

const needsHand = new Map();

for (const file of files) {
  let s = readFileSync(file, 'utf8');

  // Only the barrel import; deep `@/components/ds/X` paths are handled by hand.
  const re = /import\s*\{([^}]*)\}\s*from\s*'@\/components\/ds';?\n/g;
  s = s.replace(re, (_m, inner) => {
    const names = inner
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);

    const byModule = new Map();
    const manual = [];

    for (const n of names) {
      if (MANUAL.has(n)) {
        manual.push(n);
        continue;
      }
      const mod = DIRECT[n];
      if (!mod) {
        manual.push(n);
        continue;
      }
      if (!byModule.has(mod)) byModule.set(mod, []);
      byModule.get(mod).push(n);
    }

    if (manual.length > 0) needsHand.set(file, manual);

    const lines = [...byModule.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mod, ns]) => `import { ${ns.sort().join(', ')} } from '${mod}';`);

    // Leave a marker import for the manual names so the file still parses and
    // typecheck points straight at what is left to do.
    if (manual.length > 0) {
      lines.push(`import { ${manual.sort().join(', ')} } from '@/components/ds';`);
    }

    return lines.join('\n') + '\n';
  });

  writeFileSync(file, s);
}

console.log(`rewrote imports in ${files.length} file(s)\n`);
console.log('STILL NEEDS A HAND REWRITE (API differs):');
for (const [f, names] of [...needsHand].sort()) {
  console.log(`  ${f.replace('src/', '')}\n      ${names.join(', ')}`);
}
console.log(`\n${needsHand.size} file(s) to rewrite by hand.`);
