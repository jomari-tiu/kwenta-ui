import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Fix floating popups rendering BEHIND modals.
 *
 * The ported primitives disagreed on stacking: dialog.tsx used z-[900] while
 * select/popover/tooltip used z-50. So a <Select> inside a <Dialog> opened its
 * options underneath the modal and could not be clicked — which broke the
 * account picker on every form (transaction, installment, account, recurring
 * rule) and the filter drawer's selects.
 *
 * One explicit scale, applied consistently:
 *
 *   800  Sheet / Drawer      surface
 *   900  Dialog              surface (sits above a drawer)
 *  1000  Select / Popover    floating, must clear ANY surface
 *  1100  Tooltip             floating, must clear even an open dropdown
 *
 * The rule: a floating layer is always numerically above every surface layer,
 * so nesting a picker inside a modal can never bury it again.
 */
const SCALE = [
  {
    file: 'src/components/ui/sheet.tsx',
    from: 'z-50',
    to: 'z-[800]',
    note: 'drawer surface',
  },
  {
    file: 'src/components/ui/select.tsx',
    from: 'z-50',
    to: 'z-[1000]',
    note: 'select popup — must clear dialog (900)',
  },
  {
    file: 'src/components/ui/popover.tsx',
    from: 'z-50',
    to: 'z-[1000]',
    note: 'popover / date picker popup',
  },
  {
    file: 'src/components/ui/tooltip.tsx',
    from: 'z-50',
    to: 'z-[1100]',
    note: 'tooltip above an open dropdown',
  },
];

for (const { file, from, to, note } of SCALE) {
  const before = readFileSync(file, 'utf8');
  // Word-boundary split so `z-50` never matches inside e.g. `z-500`.
  const after = before.split(new RegExp(`\\b${from}\\b`, 'g')).join(to);
  if (after === before) {
    console.warn(`NO CHANGE  ${file} (no ${from} found)`);
  } else {
    const count = (before.match(new RegExp(`\\b${from}\\b`, 'g')) ?? []).length;
    writeFileSync(file, after);
    console.log(`${file}: ${count}x ${from} -> ${to}   (${note})`);
  }
}

console.log('\nfinal scale: sheet 800 < dialog 900 < select/popover 1000 < tooltip 1100');
