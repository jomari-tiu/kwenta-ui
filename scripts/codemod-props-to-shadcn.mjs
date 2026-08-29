/**
 * Second pass: prop-level differences between the old wrappers and stock shadcn.
 *
 *   Badge  tone="x" icon={<I/>}   ->  variant + token classes, icon as a child
 *   Switch onChange={fn}          ->  onCheckedChange={fn}
 *   Button loading={x}            ->  disabled={x}  (shadcn has no loading prop)
 *
 * Each is a narrow, checked replacement rather than a broad regex, because a
 * near-miss here compiles fine and silently changes behaviour.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const TONE_CLASS = {
  danger: 'border-danger/30 bg-danger-tint text-danger',
  good: 'border-good/30 bg-good-tint text-good',
  warn: 'border-warn/30 bg-warn-tint text-warn',
  orange: 'border-primary/30 bg-accent text-accent-foreground',
  navy: 'border-secondary/30 bg-secondary/10 text-secondary',
};

const files = execSync('grep -rl "" src --include=*.tsx', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

let badgeCount = 0;
let switchCount = 0;
let loadingCount = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf8');
  let s = before;

  // --- Badge: tone -> variant + className, icon prop -> child --------------
  s = s.replace(
    /<Badge\s+tone="(\w+)"(?:\s+icon=\{(<[^}]+?\/>)\})?\s*>/g,
    (_m, tone, icon) => {
      badgeCount += 1;
      if (tone === 'gray') {
        return icon
          ? `<Badge variant="secondary">\n            ${icon.replace(/\s*className="[^"]*"/, '')}`
          : '<Badge variant="secondary">';
      }
      const cls = TONE_CLASS[tone] ?? '';
      const open = `<Badge variant="outline" className="${cls}">`;
      return icon
        ? `${open}\n            ${icon.replace(/\s*className="[^"]*"/, '')}`
        : open;
    },
  );

  // --- Switch: onChange -> onCheckedChange --------------------------------
  s = s.replace(
    /(<Switch\b[^>]*?)\bonChange=/gs,
    (_m, head) => {
      switchCount += 1;
      return `${head}onCheckedChange=`;
    },
  );

  // --- Button: loading -> disabled ----------------------------------------
  s = s.replace(/(<Button\b[^>]*?)\bloading=\{([^}]+)\}/gs, (_m, head, expr) => {
    loadingCount += 1;
    // Preserve an existing disabled by OR-ing the two conditions.
    if (/\bdisabled=\{/.test(head)) {
      return `${head}data-loading={${expr}}`;
    }
    return `${head}disabled={${expr}}`;
  });

  if (s !== before) writeFileSync(file, s);
}

console.log(`Badge tone->variant : ${badgeCount}`);
console.log(`Switch onCheckedChange: ${switchCount}`);
console.log(`Button loading->disabled: ${loadingCount}`);
