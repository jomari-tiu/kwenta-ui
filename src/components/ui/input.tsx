import * as React from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'h-[42px] w-full min-w-0 rounded-[var(--radius-sm)] border-[1.5px] border-[var(--border-strong)] bg-card px-3 text-sm transition-[border-color,box-shadow] outline-none',
        'placeholder:text-[var(--text-faint)]',
        'focus-visible:border-[var(--orange)] focus-visible:ring-[3px] focus-visible:ring-[var(--orange-tint)]',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--surface-inset)] disabled:opacity-60',
        'aria-invalid:border-[var(--danger)] aria-invalid:ring-[3px] aria-invalid:ring-[var(--danger-tint)]',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
