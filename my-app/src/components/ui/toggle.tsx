import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Toggle as TogglePrimitive } from "radix-ui"

const toggleVariants = cva(
  "mass-key inline-flex items-center justify-center gap-2 border border-edge bg-s2 px-3 font-legend text-[13px] font-medium uppercase tracking-legend whitespace-nowrap text-ink-2 transition-[background-color,color] duration-1 ease-out outline-none hover:bg-s3 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 data-[state=on]:border-edge-strong data-[state=on]:bg-s0 data-[state=on]:text-ink data-[state=on]:shadow-[inset_0_-2px_0_var(--color-viable)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "",
        outline: "bg-transparent",
      },
      size: {
        default: "h-9 min-w-9",
        sm: "h-8 min-w-8 px-2",
        lg: "h-11 min-w-11 px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
