import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 bg-transparent font-legend text-legend font-medium uppercase tracking-legend whitespace-nowrap transition-[background-color,color,border-color] duration-1 ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /* The one accent-filled key per screen (contract section 6). */
        default:
          "cut-key bg-primary text-primary-foreground hover:bg-viable-hi active:bg-viable-lo",
        /* Outline at rest; fills only on hover and press. */
        destructive:
          "border border-plague bg-transparent text-plague-outline-ink hover:bg-plague-tint active:bg-plague active:text-plague-ink",
        secondary:
          "border border-edge bg-s2 text-ink shadow-[inset_0_1px_0_var(--color-edge-hi)] hover:bg-s3 active:bg-s1",
        outline:
          "border border-edge-strong bg-transparent text-ink hover:bg-s1",
        ghost: "text-ink-2 hover:bg-s1 hover:text-ink active:bg-s0",
        link: "h-auto px-0 font-body text-body normal-case tracking-normal text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink",
      },
      size: {
        default: "h-11 px-5 has-[>svg]:px-4",
        xs: "h-7 gap-1 px-2 text-tiny has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-12 px-6 has-[>svg]:px-5",
        icon: "size-11",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean
    }
>(({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
