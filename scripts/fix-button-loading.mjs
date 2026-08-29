/**
 * Turn the remaining `loading={...}` props on <Button> into `disabled={...}`.
 *
 * shadcn's Button has no `loading` prop. Earlier attempts used a
 * `<Button[^>]*?loading=` regex, which silently missed every Button whose
 * props contain an arrow function — `onClick={() => ...}` has a `>` in it, so
 * the character class stops early. This walks backwards from each `loading=`
 * to the nearest opening tag instead, so the enclosing element is known for
 * certain. ConfirmDialog legitimately takes `loading` and is left alone.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync('grep -rl "loading={" src --include=*.tsx', {
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter(Boolean);

let changed = 0;
let skipped = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf8');
  let s = before;
  let out = '';
  let idx = 0;

  for (;;) {
    const at = s.indexOf('loading={', idx);
    if (at === -1) {
      out += s.slice(idx);
      break;
    }

    // Walk back to the nearest '<' that starts a JSX element.
    const openAt = s.lastIndexOf('<', at);
    const tag = /^<\s*([A-Za-z][A-Za-z0-9_]*)/.exec(s.slice(openAt, at));
    const name = tag?.[1] ?? '';

    if (name === 'Button') {
      out += s.slice(idx, at) + 'disabled={';
      idx = at + 'loading={'.length;
      changed += 1;
    } else {
      out += s.slice(idx, at + 'loading={'.length);
      idx = at + 'loading={'.length;
      skipped += 1;
    }
  }

  if (out !== before) writeFileSync(file, out);
}

console.log(`Button loading -> disabled: ${changed}`);
console.log(`left alone (ConfirmDialog etc.): ${skipped}`);
