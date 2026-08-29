import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-[3px] focus-visible:ring-[var(--orange-tint)] active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Sqrly primary — orange with branded lift shadow
        default:
          'bg-[var(--orange)] text-white shadow-[var(--shadow-accent)] hover:brightness-105 hover:bg-[var(--orange-600)]',
        // Sqrly navy — secondary brand button
        navy: 'bg-[var(--navy)] text-white hover:brightness-110 hover:bg-[var(--navy-700)]',
        // Sqrly secondary — outlined card-bg button
        secondary:
          'bg-card text-[var(--heading)] border border-[var(--border-strong)] hover:bg-[var(--surface-2)]',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground',
        // Sqrly ghost — orange-tint pill (used for "Ask Sqrly" CTAs)
        ghost:
          'bg-[var(--orange-tint)] text-[var(--orange-600)] hover:brightness-95',
        // Sqrly subtle — quiet inset chip
        subtle:
          'bg-[var(--surface-inset)] text-[var(--text)] hover:bg-[var(--border)]',
        // Sqrly quiet — borderless, text-only
        quiet:
          'bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-inset)] hover:text-[var(--heading)]',
        // Sqrly danger — tinted, low-emphasis
        destructive:
          'bg-[var(--danger-tint)] text-[var(--danger)] hover:brightness-95 focus-visible:ring-[var(--danger)]/20',
        // Sqrly dangerSolid — high-emphasis destructive
        dangerSolid:
          'bg-[var(--danger)] text-white hover:brightness-105 focus-visible:ring-[var(--danger)]/30',
        link: 'text-[var(--orange-600)] underline-offset-4 hover:underline',
      },
      size: {
        // sm = 34px, default = 42px, lg = 50px — per Sqrly density spec
        sm: "h-[34px] gap-1.5 rounded-[var(--radius-sm)] px-3 text-[13px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        default:
          "h-[42px] gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-[18px]",
        lg: "h-[50px] gap-2 px-5 text-[15px] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4 [&_svg:not([class*='size-'])]:size-5",
        xs: "h-7 gap-1 rounded-[var(--radius-xs)] px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        icon: 'size-[42px]',
        'icon-xs':
          "size-7 rounded-[var(--radius-xs)] [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': "size-[34px] [&_svg:not([class*='size-'])]:size-4",
        'icon-lg': 'size-[50px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
