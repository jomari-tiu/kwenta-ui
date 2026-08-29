/**
 * Make every <SelectValue> render a LABEL, not the raw value.
 *
 * base-ui's Select.Value shows the selected value verbatim unless you give it a
 * render function (or hand Select.Root an `items` map). With uuid-valued items
 * that meant the Account picker displayed
 * "9064abdb-73a8-4902-9bdf-f673dc56c24e" instead of "GCash" — it type-checked
 * and rendered, so only looking at it caught this.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const EDITS = [
  // ---- TransactionForm: accounts -------------------------------------
  {
    file: 'src/pages/transactions/_form/TransactionForm.tsx',
    pairs: [
      [
        `                <SelectValue placeholder="Select an account" />`,
        `                <SelectValue placeholder="Select an account">
                  {(v) =>
                    accounts.find((a) => a.id === v)?.name ??
                    'Select an account'
                  }
                </SelectValue>`,
      ],
    ],
  },
  // ---- InstallmentForm: categories + accounts -------------------------
  {
    file: 'src/pages/installments/_form/InstallmentForm.tsx',
    pairs: [
      [
        `                    <SelectValue placeholder="Select a category" />`,
        `                    <SelectValue placeholder="Select a category">
                      {(v) =>
                        (categoryData?.result ?? []).find((c) => c.id === v)
                          ?.name ?? 'Select a category'
                      }
                    </SelectValue>`,
      ],
      [
        `                    <SelectValue placeholder="Select an account" />`,
        `                    <SelectValue placeholder="Select an account">
                      {(v) =>
                        (accountData?.result ?? []).find((a) => a.id === v)
                          ?.name ?? 'Select an account'
                      }
                    </SelectValue>`,
      ],
    ],
  },
  // ---- AccountsPage: account kind -------------------------------------
  {
    file: 'src/pages/accounts/AccountsPage.tsx',
    pairs: [
      [
        `                  <SelectValue placeholder="Select a type" />`,
        `                  <SelectValue placeholder="Select a type">
                    {(v) =>
                      ACCOUNT_KIND_LABELS[v as TAccount['kind']] ??
                      'Select a type'
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
      console.warn(`  MISS ${file}: ${from.trim().slice(0, 50)}`);
      continue;
    }
    s = s.split(from).join(to);
    n += 1;
  }
  writeFileSync(file, s);
  console.log(`${file.replace('src/', '')}: ${n} select(s) labelled`);
}
