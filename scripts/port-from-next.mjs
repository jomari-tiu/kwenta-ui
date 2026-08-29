/**
 * One-shot mechanical port of files copied out of the Next.js project.
 *
 * Kept in the repo rather than run ad hoc so the transformation is auditable —
 * if a ported component misbehaves, this is the list of things that were
 * rewritten under it.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = [
  'src/components/ui',
  'src/components/ds',
  'src/components/ds/form',
  'src/hooks',
  'src/lib',
];

/** [pattern, replacement, humanLabel] */
const RULES = [
  // Next server/client boundary has no meaning in a Vite SPA.
  [/^\s*['"]use client['"];?\s*\n/gm, '', 'strip "use client"'],

  // Routing.
  [
    /import\s*\{([^}]*)\}\s*from\s*['"]next\/navigation['"];?/g,
    "import {$1} from 'react-router';",
    'next/navigation -> react-router',
  ],
  [
    /import\s+Link\s+from\s*['"]next\/link['"];?/g,
    "import { Link } from 'react-router';",
    'next/link -> react-router Link',
  ],
  [/\buseRouter\b/g, 'useNavigate', 'useRouter -> useNavigate'],
  // Scoped to the router identifier ONLY. A bare /(\w+)\.push\(/ would rewrite
  // every array.push() in the codebase.
  [
    /\b(router|navigate)\.push\(/g,
    'navigate(',
    'router.push(x) -> navigate(x)',
  ],
  [
    /\b(router|navigate)\.replace\(([^;]*?)\)/g,
    'navigate($2, { replace: true })',
    'router.replace(x) -> navigate(x, {replace:true})',
  ],
  [
    /\bconst\s+router\s*=\s*useNavigate\(\)/g,
    'const navigate = useNavigate()',
    'rename router binding',
  ],
  // NOTE: deliberately NOT rewriting a bare `router` identifier. A /\brouter\b/
  // rule also matches inside the string 'react-router', turning imports into
  // 'react-navigate'. The handful of remaining bindings are renamed by hand.

  // Env.
  [
    /process\.env\.NEXT_PUBLIC_API_URL/g,
    'import.meta.env.VITE_API_URL',
    'env var',
  ],

  // next-themes keeps working, but the import path for its types differs none.
  // Nothing to do.

  // Link prop.
  [/<Link\s+href=/g, '<Link to=', 'Link href -> to'],
];

let touched = 0;
const applied = new Map();

function walk(dir) {
  let out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) continue; // roots are listed explicitly
    if (/\.(ts|tsx)$/.test(entry)) out.push(p);
  }
  return out;
}

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const before = readFileSync(file, 'utf8');
    let after = before;
    for (const [pattern, replacement, label] of RULES) {
      const next = after.replace(pattern, replacement);
      if (next !== after) applied.set(label, (applied.get(label) ?? 0) + 1);
      after = next;
    }
    if (after !== before) {
      writeFileSync(file, after);
      touched += 1;
    }
  }
}

console.log(`patched ${touched} file(s)`);
for (const [label, count] of [...applied].sort()) {
  console.log(`  ${label}: ${count}`);
}
