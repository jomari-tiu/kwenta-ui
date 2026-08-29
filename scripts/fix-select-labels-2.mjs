import { readFileSync, writeFileSync } from 'node:fs';

const WEEKDAYS = `['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']`;
const MONTHS = `['January','February','March','April','May','June','July','August','September','October','November','December']`;

const EDITS = [
  {
    file: 'src/pages/recurring-rules/RecurringRulesPage.tsx',
    pairs: [
      [
        `                  <SelectValue placeholder="How often" />`,
        `                  <SelectValue placeholder="How often">
                    {(v) =>
                      v === 'biweekly'
                        ? 'Every 2 weeks'
                        : typeof v === 'string' && v
                          ? v.charAt(0).toUpperCase() + v.slice(1)
                          : 'How often'
                    }
                  </SelectValue>`,
      ],
      [
        `                    <SelectValue placeholder="Pick a day" />`,
        `                    <SelectValue placeholder="Pick a day">
                      {(v) => ${WEEKDAYS}[Number(v) - 1] ?? 'Pick a day'}
                    </SelectValue>`,
      ],
      [
        `                        <SelectValue placeholder="Pick a month" />`,
        `                        <SelectValue placeholder="Pick a month">
                          {(v) => ${MONTHS}[Number(v) - 1] ?? 'Pick a month'}
                        </SelectValue>`,
      ],
      [
        `                  <SelectValue placeholder="Select a category" />`,
        `                  <SelectValue placeholder="Select a category">
                    {(v) =>
                      (categoryData?.result ?? []).find((c) => c.id === v)
                        ?.name ?? 'Select a category'
                    }
                  </SelectValue>`,
      ],
      [
        `                  <SelectValue placeholder="Select an account" />`,
        `                  <SelectValue placeholder="Select an account">
                    {(v) =>
                      (accountData?.result ?? []).find((a) => a.id === v)
                        ?.name ?? 'Select an account'
                    }
                  </SelectValue>`,
      ],
    ],
  },
];

for (const { file, pairs } of EDITS) {
  let s = readFileSync(file, 'utf8');
  let n = 0;
  for (const [from, to] of pairs) {
    if (!s.includes(from)) {
      console.warn(`  MISS: ${from.trim().slice(0, 55)}`);
      continue;
    }
    s = s.split(from).join(to);
    n += 1;
  }
  writeFileSync(file, s);
  console.log(`${file.replace('src/', '')}: ${n} labelled`);
}

// --- TransactionsPage: three "All" filters, each with its own lookup -------
{
  const file = 'src/pages/transactions/TransactionsPage.tsx';
  let s = readFileSync(file, 'utf8');
  const parts = s.split(`            <SelectValue placeholder="All" />`);
  if (parts.length === 4) {
    const labels = [
      `            <SelectValue placeholder="All">
              {(v) =>
                v === ALL_VALUE || !v
                  ? 'All'
                  : v === 'income'
                    ? 'Income'
                    : 'Expense'
              }
            </SelectValue>`,
      `            <SelectValue placeholder="All">
              {(v) =>
                v === ALL_VALUE || !v
                  ? 'All'
                  : ((categoryData?.result ?? []).find((c) => c.id === v)
                      ?.name ?? 'All')
              }
            </SelectValue>`,
      `            <SelectValue placeholder="All">
              {(v) =>
                v === ALL_VALUE || !v
                  ? 'All'
                  : ((accountData?.result ?? []).find((a) => a.id === v)
                      ?.name ?? 'All')
              }
            </SelectValue>`,
    ];
    s = parts[0] + labels[0] + parts[1] + labels[1] + parts[2] + labels[2] + parts[3];
    writeFileSync(file, s);
    console.log('pages/transactions/TransactionsPage.tsx: 3 labelled');
  } else {
    console.warn(`TransactionsPage: expected 3 bare SelectValue, found ${parts.length - 1}`);
  }
}
