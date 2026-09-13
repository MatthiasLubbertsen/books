import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors " +
    "outline-none hover:bg-muted disabled:pointer-events-none disabled:opacity-50 " +
    "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground " +
    "focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      size: {
        default: 'h-9 px-3',
        sm: 'h-8 px-2.5',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

export { toggleVariants };
export type ToggleVariants = VariantProps<typeof toggleVariants>;
