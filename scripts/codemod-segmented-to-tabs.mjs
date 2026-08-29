/**
 * SegmentedControl -> shadcn Tabs.
 *
 * TabsList/TabsTrigger IS the segmented control in shadcn, so the custom
 * component was redundant. Tabs here are used purely as a value switch (no
 * TabsContent) — the page below reacts to the value itself.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const EDITS = [
  {
    file: 'src/pages/dashboard/DashboardPage.tsx',
    from: `        <SegmentedControl<TPeriod>
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
    to: `        <Tabs
          value={period}
          onValueChange={(v) => {
            setPeriod(v as TPeriod);
            setAnchor(todayPlainDate());
          }}
        >
          <TabsList aria-label="Period">
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>`,
  },
  {
    file: 'src/pages/categories/CategoriesPage.tsx',
    from: `        <SegmentedControl<TCategoryKind>
          value={kind}
          onChange={setKind}
          options={[
            { label: 'Expense', value: 'expense' },
            { label: 'Income', value: 'income' },
          ]}
          aria-label="Category kind"
        />`,
    to: `        <Tabs
          value={kind}
          onValueChange={(v) => setKind(v as TCategoryKind)}
        >
          <TabsList aria-label="Category kind">
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>
        </Tabs>`,
  },
  {
    file: 'src/pages/installments/InstallmentsPage.tsx',
    from: `        <SegmentedControl<'active' | 'completed' | 'all'>
          value={status}
          onChange={setStatus}
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Completed', value: 'completed' },
            { label: 'All', value: 'all' },
          ]}
          aria-label="Plan status"
        />`,
    to: `        <Tabs
          value={status}
          onValueChange={(v) => setStatus(v as typeof status)}
        >
          <TabsList aria-label="Plan status">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>`,
  },
];

for (const { file, from, to } of EDITS) {
  let s = readFileSync(file, 'utf8');
  if (!s.includes(from)) {
    console.warn(`MISS ${file}`);
    continue;
  }
  s = s.split(from).join(to);
  // Drop SegmentedControl from the leftover ds import, add the Tabs import.
  s = s.replace(/,?\s*SegmentedControl(?=[,\s}])/, '');
  s = s.replace(
    /import \{([^}]*)\} from '@\/components\/ds';\n/,
    (m, inner) => {
      const names = inner
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);
      const tabsImport = `import {\n  Tabs,\n  TabsList,\n  TabsTrigger,\n} from '@/components/ui/tabs';\n`;
      return names.length > 0
        ? `import { ${names.join(', ')} } from '@/components/ds';\n${tabsImport}`
        : tabsImport;
    },
  );
  writeFileSync(file, s);
  console.log(`migrated ${file.replace('src/', '')}`);
}
