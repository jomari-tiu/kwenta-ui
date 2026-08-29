import { readFileSync, writeFileSync } from 'node:fs';

function edit(file, pairs) {
  let s = readFileSync(file, 'utf8');
  let n = 0;
  for (const [from, to] of pairs) {
    if (!s.includes(from)) {
      console.warn(`  MISS ${file}: ${JSON.stringify(from.slice(0, 60))}`);
      continue;
    }
    s = s.split(from).join(to);
    n += 1;
  }
  writeFileSync(file, s);
  console.log(`${file}: ${n}`);
}

// 1. LoginPage: drive the "slow" flag from the submit handler rather than an
//    effect that setStates on every pending change (cascading renders).
edit('src/pages/login/LoginPage.tsx', [
  ["import { useEffect, useState } from 'react';", "import { useRef, useState } from 'react';"],
  [
    `  // If a request is taking a while, say why rather than looking frozen.
  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(t);
  }, [pending]);`,
    `  // If a request is taking a while, say why rather than looking frozen. Driven
  // from the submit handler, not an effect — an effect here would setState on
  // every pending transition and cascade renders.
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);`,
  ],
  [
    `    setPending(true);
    setError(null);
    try {`,
    `    setPending(true);
    setError(null);
    setSlow(false);
    slowTimer.current = setTimeout(() => setSlow(true), 3000);
    try {`,
  ],
  [
    `    } finally {
      setPending(false);
    }`,
    `    } finally {
      if (slowTimer.current) clearTimeout(slowTimer.current);
      setSlow(false);
      setPending(false);
    }`,
  ],
]);

// 2. Async handlers passed where a void return is expected.
const promiseFixes = [
  ['src/pages/installments/InstallmentsPage.tsx', 'onSubmit={handleCreate}', 'onSubmit={(v) => void handleCreate(v)}'],
  ['src/pages/recurring-rules/RecurringRulesPage.tsx', 'onConfirm={handleDelete}', 'onConfirm={() => void handleDelete()}'],
  ['src/pages/transactions/TransactionsPage.tsx', 'onClick={handleExport}', 'onClick={() => void handleExport()}'],
  ['src/pages/transactions/TransactionsPage.tsx', 'onConfirm={handleDelete}', 'onConfirm={() => void handleDelete()}'],
  ['src/pages/calendar/_components/DayPanel.tsx', 'onConfirm={handleDelete}', 'onConfirm={() => void handleDelete()}'],
  ['src/pages/calendar/_components/DayPanel.tsx', 'onConfirm={handleUnpay}', 'onConfirm={() => void handleUnpay()}'],
  ['src/pages/calendar/_components/DayPanel.tsx', 'onClick={handlePay}', 'onClick={() => void handlePay()}'],
  ['src/pages/installments/InstallmentDetailPage.tsx', 'onConfirm={handleDelete}', 'onConfirm={() => void handleDelete()}'],
  ['src/pages/installments/InstallmentDetailPage.tsx', 'onConfirm={handleUnpay}', 'onConfirm={() => void handleUnpay()}'],
  ['src/pages/installments/InstallmentDetailPage.tsx', 'onClick={handlePay}', 'onClick={() => void handlePay()}'],
  ['src/pages/categories/CategoriesPage.tsx', 'onConfirm={handleDelete}', 'onConfirm={() => void handleDelete()}'],
  ['src/pages/categories/CategoriesPage.tsx', 'onSubmit={handleSubmit}', 'onSubmit={(v) => void handleSubmit(v)}'],
  ['src/pages/accounts/AccountsPage.tsx', 'onConfirm={handleDelete}', 'onConfirm={() => void handleDelete()}'],
  ['src/pages/accounts/AccountsPage.tsx', 'onSubmit={handleSubmit}', 'onSubmit={(v) => void handleSubmit(v)}'],
  ['src/pages/budgets/BudgetsPage.tsx', 'onClick={handleSave}', 'onClick={() => void handleSave()}'],
  ['src/pages/recurring-rules/RecurringRulesPage.tsx', 'onSubmit={handleSubmit}', 'onSubmit={(v) => void handleSubmit(v)}'],
  ['src/pages/calendar/_components/QuickEntryForm.tsx', 'onSubmit={handleSubmit}', 'onSubmit={(v) => void handleSubmit(v)}'],
  ['src/components/TransactionDialog.tsx', 'onSubmit={handleSubmit}', 'onSubmit={(v) => void handleSubmit(v)}'],
];

const grouped = new Map();
for (const [file, from, to] of promiseFixes) {
  if (!grouped.has(file)) grouped.set(file, []);
  grouped.get(file).push([from, to]);
}
for (const [file, pairs] of grouped) edit(file, pairs);

// 3. router.tsx exports `router`, not a component — the react-refresh rule does
//    not apply to a route table.
edit('src/router.tsx', [
  [
    "import { lazy, Suspense } from 'react';",
    "/* eslint-disable react-refresh/only-export-components -- this file exports a\n   route table, not components; HMR boundaries do not apply. */\nimport { lazy, Suspense } from 'react';",
  ],
]);

// 4. TransactionForm: memoise the derived lists so the useMemo deps are stable.
edit('src/pages/transactions/_form/TransactionForm.tsx', [
  [
    `  const categories = categoryData?.result ?? [];
  const accounts = accountData?.result ?? [];`,
    `  const categories = useMemo(
    () => categoryData?.result ?? [],
    [categoryData?.result],
  );
  const accounts = useMemo(
    () => accountData?.result ?? [],
    [accountData?.result],
  );`,
  ],
]);
