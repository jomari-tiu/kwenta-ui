import { readFileSync, writeFileSync } from 'node:fs';

const f = 'src/pages/recurring-rules/RecurringRulesPage.tsx';
let s = readFileSync(f, 'utf8');

const WEEKDAYS = `['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']`;
const MONTHS = `['January','February','March','April','May','June','July','August','September','October','November','December']`;

/** A shadcn Select field, written out per field as the docs show. */
const selectField = (name, label, placeholder, itemsExpr) => `      <FormField
        control={form.control}
        name="${name}"
        render={({ field }) => (
          <FormItem>
            <FormLabel>${label}</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="${placeholder}" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                ${itemsExpr}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />`;

const textField = (name, label, extra = '') => `      <FormField
        control={form.control}
        name="${name}"
        render={({ field }) => (
          <FormItem>
            <FormLabel>${label}</FormLabel>
            <FormControl>
              <Input ${extra} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />`;

// ---- RuleFormBody: FormWrapper -> Form + form ----------------------------
s = s.replace(
  `    <FormWrapper<TRuleFormValues>
      schema={ruleSchema}
      defaultValues={defaultValues}
      onSubmit={(v) => void handleSubmit(v)}
      className="flex flex-col gap-4"
    >
      <RuleFields isEdit={Boolean(existing)} />`,
  `    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) => void handleSubmit(v))}
        className="flex flex-col gap-4"
      >
      <RuleFields form={form} isEdit={Boolean(existing)} />`,
);

s = s.replace(
  `    </FormWrapper>
  );
}`,
  `      </form>
    </Form>
  );
}`,
);

// useForm in RuleFormBody
s = s.replace(
  /(\n  async function handleSubmit\(values: TRuleFormValues\) \{)/,
  `
  const form = useForm<TRuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues,
  });
$1`,
);

// ---- RuleFields signature: take the form instead of context --------------
s = s.replace(
  `function RuleFields({ isEdit }: { isEdit: boolean }) {
  const { watch, setValue } = useFormContext<TRuleFormValues>();
  const type = watch('type');
  const frequency = watch('frequency');`,
  `function RuleFields({
  form,
  isEdit,
}: {
  form: UseFormReturn<TRuleFormValues>;
  isEdit: boolean;
}) {
  const type = form.watch('type');
  const frequency = form.watch('frequency');`,
);
s = s.split('setValue(').join('form.setValue(');

// ---- each field ---------------------------------------------------------
s = s.replace(
  `      <FormInput<TRuleFormValues>
        name="name"
        label="Name"
        placeholder="Salary — kinsenas"
        autoFocus
      />`,
  textField('name', 'Name', 'placeholder="Salary — kinsenas" autoFocus'),
);

s = s.replace(
  `      <FormMoneyInput<TRuleFormValues> name="amount" label="Amount" />`,
  `      <FormField
        control={form.control}
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Amount</FormLabel>
            <FormControl>
              <MoneyInput
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />`,
);

s = s.replace(
  /      <FormSelect<TRuleFormValues>\n        name="frequency"[\s\S]*?\/>\n/,
  selectField(
    'frequency',
    'Repeats',
    'How often',
    `{FREQUENCIES.map((fr) => (
                  <SelectItem key={fr} value={fr}>
                    {fr === 'biweekly'
                      ? 'Every 2 weeks'
                      : fr.charAt(0).toUpperCase() + fr.slice(1)}
                  </SelectItem>
                ))}`,
  ) + '\n',
);

s = s.replace(
  /        <FormSelect<TRuleFormValues>\n          name="dayOfWeek"[\s\S]*?\/>\n/,
  selectField(
    'dayOfWeek',
    'On',
    'Pick a day',
    `{${WEEKDAYS}.map((d, i) => (
                  <SelectItem key={d} value={String(i + 1)}>
                    {d}
                  </SelectItem>
                ))}`,
  ) + '\n',
);

s = s.replace(
  /          <FormInput<TRuleFormValues>\n            name="dayOfMonth"[\s\S]*?\/>\n/,
  textField('dayOfMonth', 'Day of month', 'inputMode="numeric"') + '\n',
);

s = s.replace(
  /            <FormSelect<TRuleFormValues>\n              name="monthOfYear"[\s\S]*?\/>\n/,
  selectField(
    'monthOfYear',
    'Month',
    'Pick a month',
    `{${MONTHS}.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}`,
  ) + '\n',
);

s = s.replace(
  `        <FormInput<TRuleFormValues>
          name="startDate"
          label="Starts"
          type="date"
        />`,
  textField('startDate', 'Starts', 'type="date"'),
);

s = s.replace(
  `        <FormInput<TRuleFormValues>
          name="endDate"
          label="Ends (optional)"
          type="date"
        />`,
  textField('endDate', 'Ends (optional)', 'type="date"'),
);

s = s.replace(
  /      <FormSelect<TRuleFormValues>\n        name="categoryId"[\s\S]*?\/>\n/,
  selectField(
    'categoryId',
    'Category',
    'Select a category',
    `{(categoryData?.result ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}`,
  ) + '\n',
);

s = s.replace(
  /      <FormSelect<TRuleFormValues>\n        name="accountId"[\s\S]*?\/>\n/,
  selectField(
    'accountId',
    'Account',
    'Select an account',
    `{(accountData?.result ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}`,
  ) + '\n',
);

// ---- imports ------------------------------------------------------------
s = s.replace(
  /import \{[^}]*\} from '@\/components\/ds';\n/,
  `import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyInput } from '@/components/finance';
`,
);

s = s.replace(
  "import { useFormContext } from 'react-hook-form';",
  "import { useForm, type UseFormReturn } from 'react-hook-form';\nimport { zodResolver } from '@hookform/resolvers/zod';",
);

s = s.split('text-text-muted').join('text-muted-foreground');
s = s.split('text-text-faint').join('text-muted-foreground/70');
s = s.split('hover:text-text"').join('hover:text-foreground"');
s = s.split('bg-surface-inset').join('bg-muted');

writeFileSync(f, s);
console.log('RecurringRulesPage form migrated');
