import { PlugZap } from 'lucide-react';

export type StartupErrorProps = {
  title: string;
  detail: string;
  /** Ordered steps that actually fix it. Shown as a numbered list. */
  steps?: string[];
  /** The underlying error, when there is one worth showing. */
  technical?: string;
};

/**
 * The screen shown when the app cannot start at all.
 *
 * Rendered WITHOUT the router, React Query or the theme provider, because a
 * startup failure may be the reason those are unavailable. It therefore uses
 * only design tokens already present in globals.css — no context, no data
 * fetching, nothing that could fail a second time and leave a blank page again.
 */
export function StartupError({
  title,
  detail,
  steps,
  technical,
}: StartupErrorProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-1 p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <span className="flex size-10 items-center justify-center rounded-full bg-danger-tint text-danger">
          <PlugZap className="size-5" />
        </span>

        <h1 className="mt-4 text-lg font-bold">{title}</h1>
        <p className="mt-1.5 text-sm text-text-muted">{detail}</p>

        {steps && steps.length > 0 ? (
          <ol className="mt-4 flex flex-col gap-2 border-t pt-4">
            {steps.map((step, i) => (
              <li key={step} className="flex gap-2.5 text-sm">
                <span className="text-2xs flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-bold">
                  {i + 1}
                </span>
                <span className="text-text-muted">{step}</span>
              </li>
            ))}
          </ol>
        ) : null}

        {technical ? (
          <p className="mt-4 rounded-md bg-muted px-3 py-2 font-mono text-xs break-words text-text-muted">
            {technical}
          </p>
        ) : null}
      </div>
    </main>
  );
}
