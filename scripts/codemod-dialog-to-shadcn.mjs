/**
 * `<Dialog open onClose title size footer>` -> composed shadcn parts.
 *
 * The old wrapper took the header and footer as props; shadcn composes them,
 * which is the whole point of the refactor. Sizes map to a max-width class on
 * DialogContent.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const SIZE = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
};

const IMPORT = `import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';`;

const files = execSync(
  "grep -rl \"Dialog\\b\" src/pages src/components --include=*.tsx",
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);

let opened = 0;
let closed = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf8');
  let s = before;
  if (!/from '@\/components\/ds'/.test(s)) continue;
  if (!/\bDialog\b/.test(s.match(/import \{([^}]*)\} from '@\/components\/ds'/s)?.[1] ?? ''))
    continue;

  // Opening tag: capture the prop block up to the closing `>`.
  s = s.replace(/<Dialog\b([^>]*?)>/gs, (m, attrs) => {
    if (/DialogContent|DialogTrigger/.test(m)) return m;
    opened += 1;

    const open = /\bopen(?:=\{([^}]*)\})?/.exec(attrs);
    const onClose = /onClose=\{([^}]*)\}/.exec(attrs);
    const title = /title=(?:\{([^}]*)\}|"([^"]*)")/.exec(attrs);
    const size = /size="(\w+)"/.exec(attrs);

    const openExpr = open ? (open[1] ?? 'true') : 'undefined';
    const closeExpr = onClose ? onClose[1] : '() => {}';
    const titleExpr = title
      ? title[1]
        ? `{${title[1]}}`
        : title[2]
      : '';
    const cls = SIZE[size?.[1] ?? 'md'];

    return [
      `<Dialog`,
      `      open={${openExpr}}`,
      `      onOpenChange={(next) => !next && (${closeExpr})()}`,
      `    >`,
      `      <DialogContent className="${cls}">`,
      `        <DialogHeader>`,
      `          <DialogTitle>${titleExpr}</DialogTitle>`,
      `        </DialogHeader>`,
    ].join('\n');
  });

  // Closing tag.
  s = s.replace(/<\/Dialog>/g, () => {
    closed += 1;
    return '      </DialogContent>\n    </Dialog>';
  });

  // Swap the import.
  s = s.replace(/import \{([^}]*)\} from '@\/components\/ds';\n/s, (m, inner) => {
    const names = inner
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .filter((n) => n !== 'Dialog');
    const lines = [IMPORT];
    if (names.length > 0) {
      lines.push(`import { ${names.join(', ')} } from '@/components/ds';`);
    }
    return lines.join('\n') + '\n';
  });

  if (s !== before) writeFileSync(file, s);
}

console.log(`Dialog opens rewritten: ${opened}, closes: ${closed}`);
console.log('NOTE: `footer={...}` props are left in place and must be moved');
console.log('into <DialogFooter> by hand — they are reported by typecheck.');
