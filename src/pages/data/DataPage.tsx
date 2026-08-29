import { useRef, useState } from 'react';
import { Download, TriangleAlert, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/finance';
import { downloadBackup, uploadBackup, type TImportResult } from './_hooks/api';

export default function DataPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [replace, setReplace] = useState(false);
  const [pending, setPending] = useState<File | null>(null);
  const [result, setResult] = useState<TImportResult | null>(null);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadBackup();
      toast.success('Backup downloaded');
    } catch {
      toast.error('Could not export');
    } finally {
      setExporting(false);
    }
  }

  function handlePick(file: File | undefined) {
    if (!file) return;
    // Overwriting is the only irreversible thing on this page, so it gets a
    // confirm. A first-time import into an empty database does not.
    if (replace) {
      setPending(file);
    } else {
      void runImport(file);
    }
  }

  async function runImport(file: File) {
    setImporting(true);
    try {
      const res = await uploadBackup(file, replace ? 'replace' : 'empty');
      setResult(res);
      // Every screen reads this data; nothing cached survives a whole-database
      // swap.
      await queryClient.invalidateQueries();
      const total = Object.values(res.inserted).reduce((a, b) => a + b, 0);
      toast.success(`Imported ${total} rows`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not import that file',
      );
    } finally {
      setImporting(false);
      setPending(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="font-bold">Export</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Downloads everything — categories, accounts, transactions,
          installments, loans, funds and budgets — as one JSON file. Your
          password is <strong>not</strong> included; production sets its own.
        </p>
        <Button
          className="mt-3"
          onClick={() => void handleExport()}
          disabled={exporting}
        >
          <Download className="size-4" />
          Download backup
        </Button>
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="font-bold">Import</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Load a backup into this server. Rows keep their original IDs, so every
          link between them survives the move.
        </p>

        <Label className="mt-3 flex items-start gap-3 rounded-md border p-3 font-normal">
          <Switch checked={replace} onCheckedChange={setReplace} />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">
              Replace everything already here
            </span>
            <span className="text-xs text-muted-foreground">
              Off, the import refuses unless this server is empty — the safe
              choice when migrating to production. On, it deletes all current
              data first.
            </span>
          </span>
        </Label>

        {replace ? (
          <Alert variant="destructive" className="mt-3">
            <TriangleAlert />
            <AlertTitle>This deletes the data on this server</AlertTitle>
            <AlertDescription>
              Everything currently stored is removed before the file is loaded.
              Export first if you are not certain.
            </AlertDescription>
          </Alert>
        ) : null}

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => handlePick(e.target.files?.[0])}
        />
        <Button
          className="mt-3"
          variant={replace ? 'destructive' : 'default'}
          onClick={() => fileRef.current?.click()}
          disabled={importing}
        >
          <Upload className="size-4" />
          {importing ? 'Importing…' : 'Choose a backup file'}
        </Button>

        {result ? (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 border-t pt-3 text-sm sm:grid-cols-3">
            {Object.entries(result.inserted).map(([k, n]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="truncate text-muted-foreground">{k}</dt>
                <dd className="tnum font-semibold">{n}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending) void runImport(pending);
        }}
        title="Replace all data on this server?"
        description="Everything currently stored is deleted, then the file is loaded. This cannot be undone."
        confirmLabel="Replace everything"
        tone="danger"
        loading={importing}
      />
    </div>
  );
}
