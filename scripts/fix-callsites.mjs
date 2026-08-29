/**
 * Adapt page call sites to the ported DS contracts:
 *  - Input.onChange gives (value: string), NOT a change event.
 *  - Tabs is a tab-panel component; use SegmentedControl for period switches.
 */
import { readFileSync, writeFileSync } from 'node:fs';

function edit(file, pairs) {
  let s = readFileSync(file, 'utf8');
  let changed = 0;
  for (const [from, to] of pairs) {
    if (!s.includes(from)) {
      console.warn(`  MISS in ${file}: ${JSON.stringify(from.slice(0, 70))}`);
      continue;
    }
    s = s.split(from).join(to);
    changed += 1;
  }
  writeFileSync(file, s);
  console.log(`${file}: ${changed} replacement(s)`);
}

// ---------------------------------------------------------------- Tabs -> SegmentedControl
edit('src/pages/dashboard/DashboardPage.tsx', [
  ['  Tabs,\n', '  SegmentedControl,\n'],
  [
    `        <Tabs
          value={period}
          onChange={(v) => {
            setPeriod(v as TPeriod);
            setAnchor(todayPlainDate());
          }}
          items={[
            { label: 'Week', value: 'week' },
            { label: 'Month', value: 'month' },
            { label: 'Year', value: 'year' },
          ]}
        />`,
    `        <SegmentedControl<TPeriod>
          value={period}
          onChange={(v) => {
            setPeriod(v);
            setAnchor(todayPlainDate());
          }}
          options={[
            { label: 'Week', value: 'week' },
            { label: 'Month', value: 'month' },
            { label: 'Year', value: 'year' },
          ]}
          aria-label="Period"
        />`,
  ],
]);

edit('src/pages/categories/CategoriesPage.tsx', [
  ['  Tabs,\n', '  SegmentedControl,\n'],
  [
    `        <Tabs
          value={kind}
          onChange={(v) => setKind(v as TCategoryKind)}
          items={[
            { label: 'Expense', value: 'expense' },
            { label: 'Income', value: 'income' },
          ]}
        />`,
    `        <SegmentedControl<TCategoryKind>
          value={kind}
          onChange={setKind}
          options={[
            { label: 'Expense', value: 'expense' },
            { label: 'Income', value: 'income' },
          ]}
          aria-label="Category kind"
        />`,
  ],
]);

edit('src/pages/installments/InstallmentsPage.tsx', [
  ['import { useMemo, useState } from', 'import { useState } from'],
  ['  Tabs,\n', '  SegmentedControl,\n'],
  [
    `        <Tabs
          value={status}
          onChange={(v) => setStatus(v as typeof status)}
          items={[
            { label: 'Active', value: 'active' },
            { label: 'Completed', value: 'completed' },
            { label: 'All', value: 'all' },
          ]}
        />`,
    `        <SegmentedControl<'active' | 'completed' | 'all'>
          value={status}
          onChange={setStatus}
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Completed', value: 'completed' },
            { label: 'All', value: 'all' },
          ]}
          aria-label="Plan status"
        />`,
  ],
]);

// ---------------------------------------------------------------- Input onChange signature
edit('src/pages/login/LoginPage.tsx', [
  ['onChange={(e) => setPassword(e.target.value)}', 'onChange={setPassword}'],
  ['                autoComplete="current-password"\n', '                autoComplete="current-password"\n'],
]);

edit('src/pages/transactions/TransactionsPage.tsx', [
  [
    `          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}`,
    `          onChange={(v) => {
            setDateFrom(v);
            setPage(1);
          }}`,
  ],
  [
    `          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}`,
    `          onChange={(v) => {
            setDateTo(v);
            setPage(1);
          }}`,
  ],
  [
    `            onChange={(e) => {
              setAmountMin(e.target.value);
              setPage(1);
            }}`,
    `            onChange={(v) => {
              setAmountMin(v);
              setPage(1);
            }}`,
  ],
  [
    `            onChange={(e) => {
              setAmountMax(e.target.value);
              setPage(1);
            }}`,
    `            onChange={(v) => {
              setAmountMax(v);
              setPage(1);
            }}`,
  ],
  [
    `          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}`,
    `          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}`,
  ],
  ['import { Archive, ArchiveRestore, Pencil, Plus, Star, Trash2 }', 'import { Archive, ArchiveRestore, Pencil, Plus, Star }'],
]);

edit('src/pages/accounts/AccountsPage.tsx', [
  [
    "import { Archive, ArchiveRestore, Pencil, Plus, Star, Trash2 } from 'lucide-react';",
    "import { Archive, ArchiveRestore, Pencil, Plus, Star } from 'lucide-react';",
  ],
]);
