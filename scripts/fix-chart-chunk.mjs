import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Keep recharts out of the shared design-system chunk.
 *
 * Re-exporting IncomeExpenseChart from components/ds/index.ts meant every page
 * that imported anything from the barrel also pulled recharts — ~200 kB gzipped
 * on the calendar, which is the daily hot path and does not chart anything.
 * The dashboard imports the chart by direct path instead, so recharts lands in
 * the lazily-loaded dashboard chunk where it belongs.
 */
const barrel = 'src/components/ds/index.ts';
let s = readFileSync(barrel, 'utf8');
s = s.replace(
  `export { IncomeExpenseChart } from './IncomeExpenseChart';
export type { IncomeExpenseChartProps } from './IncomeExpenseChart';`,
  `// IncomeExpenseChart is deliberately NOT exported here — it pulls recharts,
// and a barrel re-export would drag ~200 kB gzipped into every page that
// imports anything from the design system. Import it by path from the one page
// that charts:
//   import { IncomeExpenseChart } from '@/components/ds/IncomeExpenseChart';`,
);
writeFileSync(barrel, s);
console.log('barrel: chart export removed');

const page = 'src/pages/dashboard/DashboardPage.tsx';
let p = readFileSync(page, 'utf8');
p = p.replace('  IncomeExpenseChart,\n', '');
p = p.replace(
  "} from '@/components/ds';",
  `} from '@/components/ds';
// Imported by path, not via the barrel, so recharts stays in this route's chunk.
import { IncomeExpenseChart } from '@/components/ds/IncomeExpenseChart';`,
);
writeFileSync(page, p);
console.log('dashboard: chart imported by path');
