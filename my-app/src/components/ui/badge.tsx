import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border border-transparent px-2 py-0.5 font-legend text-[11px] font-medium uppercase tracking-legend whitespace-nowrap focus-visible:outline-2 focus-visible:outline-ring [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        /* A badge names a state: neutral outline unless a status applies. */
        default: "border-edge-strong text-ink-2",
        ok: "border-viable-lo bg-viable-tint text-viable-hi",
        warn: "border-caution bg-caution-tint text-caution",
        danger: "border-plague bg-plague-tint text-plague-outline-ink",
        info: "border-edge-strong text-neutral",
        /* A chip names an element: filled with the element in scope. */
        chip: "bg-el text-viable-ink [a&]:hover:brightness-110",
        "chip-outline": "border-el/55 text-el",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
