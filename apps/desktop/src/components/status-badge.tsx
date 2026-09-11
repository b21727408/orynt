import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const statusVariants = cva(
  'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium',
  {
    variants: {
      tone: {
        active: 'bg-active/10 text-active',
        healthy: 'bg-healthy/10 text-healthy',
        attention: 'bg-attention/10 text-attention',
        danger: 'bg-danger/10 text-danger',
        idle: 'bg-idle/10 text-idle',
        supervision: 'bg-supervision/10 text-supervision',
      },
    },
    defaultVariants: { tone: 'idle' },
  },
);

export function StatusBadge({
  tone,
  children,
}: VariantProps<typeof statusVariants> & { children: ReactNode }) {
  return (
    <span className={statusVariants({ tone })}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
