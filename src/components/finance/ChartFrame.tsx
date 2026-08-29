import { useState, type ReactNode } from 'react';
import { Table2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ChartFrameProps = {
  title: string;
  subtitle?: string;
  /** [{ label, colorVar }] — the dot carries identity, the text never does. */
  legend?: { label: string; colorClass: string }[];
  children: ReactNode;
  /**
   * REQUIRED. This is the documented accessibility relief for the dark-mode
   * contrast WARN on the expense mark (#dc2626 is 2.75:1 on #163052), and it is
   * also what a person tracking their own money often actually wants. Not
   * optional.
   */
  table: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function ChartFrame({
  title,
  subtitle,
  legend,
  children,
  table,
  action,
  className,
}: ChartFrameProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section
      className={cn(
        'rounded-lg border bg-card p-4 shadow-sm sm:p-5',
        className,
      )}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {legend && !showTable ? (
            <ul className="flex items-center gap-3">
              {legend.map((l) => (
                <li
                  key={l.label}
                  className="flex items-center gap-1.5 text-xs text-text-muted"
                >
                  <span
                    aria-hidden
                    className={cn('size-2.5 rounded-full', l.colorClass)}
                  />
                  {l.label}
                </li>
              ))}
            </ul>
          ) : null}

          {action}

          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
            className="flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:bg-muted hover:text-text"
          >
            {showTable ? (
              <>
                <BarChart3 className="size-3.5" aria-hidden />
                Chart
              </>
            ) : (
              <>
                <Table2 className="size-3.5" aria-hidden />
                Table
              </>
            )}
          </button>
        </div>
      </header>

      {showTable ? table : children}
    </section>
  );
}
