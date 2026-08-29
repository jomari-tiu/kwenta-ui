import { readFileSync, writeFileSync } from 'node:fs';

const f = 'src/pages/transactions/TransactionsPage.tsx';
let s = readFileSync(f, 'utf8');

/**
 * A shadcn Select needs a non-empty value for each item, so the "All" option
 * uses a sentinel and is mapped back to '' in the handler. Radix/base-ui both
 * reserve '' to mean "nothing selected".
 */
const ALL = '__all__';

s = s.replace(
  `  const filterFields = (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        From
        <Input
          type="date"
          value={dateFrom}
          onChange={(v) => {
            setDateFrom(v);
            setPage(1);
          }}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        To
        <Input
          type="date"
          value={dateTo}
          onChange={(v) => {
            setDateTo(v);
            setPage(1);
          }}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Type
        <Select
          value={type}
          onChange={(v) => {
            setType((v as TLedgerType) || '');
            setCategoryId('');
            setPage(1);
          }}
          placeholder="All"
          options={[
            { label: 'Income', value: 'income' },
            { label: 'Expense', value: 'expense' },
          ]}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Category
        <Select
          value={categoryId}
          onChange={(v) => {
            setCategoryId(v);
            setPage(1);
          }}
          placeholder="All"
          options={(categoryData?.result ?? [])
            .filter((c) => !type || c.kind === type)
            .map((c) => ({ label: c.name, value: c.id }))}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Account
        <Select
          value={accountId}
          onChange={(v) => {
            setAccountId(v);
            setPage(1);
          }}
          placeholder="All"
          options={(accountData?.result ?? []).map((a) => ({
            label: a.name,
            value: a.id,
          }))}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Min ₱
          <Input
            inputMode="decimal"
            value={amountMin}
            onChange={(v) => {
              setAmountMin(v);
              setPage(1);
            }}
            placeholder="0"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Max ₱
          <Input
            inputMode="decimal"
            value={amountMax}
            onChange={(v) => {
              setAmountMax(v);
              setPage(1);
            }}
            placeholder="Any"
          />
        </label>
      </div>
    </div>
  );`,
  `  const filterFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="from">From</Label>
        <Input
          id="from"
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="to">To</Label>
        <Input
          id="to"
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="grid gap-2">
        <Label>Type</Label>
        <Select
          value={type || ALL_VALUE}
          onValueChange={(v) => {
            setType(v === ALL_VALUE ? '' : (v as TLedgerType));
            setCategoryId('');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Category</Label>
        <Select
          value={categoryId || ALL_VALUE}
          onValueChange={(v) => {
            setCategoryId(v === ALL_VALUE ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All</SelectItem>
            {(categoryData?.result ?? [])
              .filter((c) => !type || c.kind === type)
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Account</Label>
        <Select
          value={accountId || ALL_VALUE}
          onValueChange={(v) => {
            setAccountId(v === ALL_VALUE ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All</SelectItem>
            {(accountData?.result ?? []).map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:col-span-2">
        <div className="grid gap-2">
          <Label htmlFor="min">Min ₱</Label>
          <Input
            id="min"
            inputMode="decimal"
            value={amountMin}
            onChange={(e) => {
              setAmountMin(e.target.value);
              setPage(1);
            }}
            placeholder="0"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="max">Max ₱</Label>
          <Input
            id="max"
            inputMode="decimal"
            value={amountMax}
            onChange={(e) => {
              setAmountMax(e.target.value);
              setPage(1);
            }}
            placeholder="Any"
          />
        </div>
      </div>
    </div>
  );`,
);

// Search box
s = s.replace(
  `        <Input
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search notes…"
          className="min-w-0 flex-1 sm:max-w-xs"
        />`,
  `        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search notes…"
          className="min-w-0 flex-1 sm:max-w-xs"
        />`,
);

// Filter Drawer -> Sheet
s = s.replace(
  /      <Drawer\n        open=\{filtersOpen\}[\s\S]*?<\/Drawer>/,
  `      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className={
            isMobile ? 'max-h-[88dvh] rounded-t-2xl' : 'w-full sm:max-w-md'
          }
        >
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4">
            {filterFields}
          </div>

          <SheetFooter className="flex-row justify-between">
            <Button variant="ghost" onClick={resetFilters}>
              Clear all
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>`,
);

// imports
s = s.replace(
  "import { Drawer, Input, Select } from '@/components/ds';",
  `import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';`,
);

// Sentinel constant — a shadcn SelectItem may not have an empty value.
s = s.replace(
  /^(export default function TransactionsPage)/m,
  `/** SelectItem cannot take an empty value, so "All" needs a sentinel. */
const ALL_VALUE = '${ALL}';

$1`,
);

s = s.split('text-text-muted').join('text-muted-foreground');
s = s.split('text-text-faint').join('text-muted-foreground/70');

writeFileSync(f, s);
console.log('TransactionsPage migrated');
