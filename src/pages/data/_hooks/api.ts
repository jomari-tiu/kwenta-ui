import { apiGetBlob, apiPost } from '@/lib/api';
import { todayPlainDate } from '@/lib/date';

export type TTableCounts = {
  categories: number;
  accounts: number;
  recurringRules: number;
  installmentPlans: number;
  installmentPayments: number;
  creditLoans: number;
  investments: number;
  transactions: number;
  budgetOverrides: number;
};

export type TImportResult = {
  mode: 'empty' | 'replace';
  inserted: TTableCounts;
};

/** Downloads the whole database as one JSON file. */
export async function downloadBackup(): Promise<void> {
  const blob = await apiGetBlob('/api/v1/data/export');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kwenta-backup-${todayPlainDate()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Send a backup file back to a server.
 *
 * `empty` is the default and refuses unless the target is blank — the safe path
 * when moving into a fresh production database. `replace` wipes first, so
 * overwriting is always a deliberate second choice.
 */
export async function uploadBackup(
  file: File,
  mode: 'empty' | 'replace',
): Promise<TImportResult> {
  const text = await file.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  return apiPost<TImportResult>(`/api/v1/data/import?mode=${mode}`, payload);
}
