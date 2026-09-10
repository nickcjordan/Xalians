import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* A surface (contract section 5). panel: level 1 on a hairline with the
   inset highlight; recessed: level 0; raised: level 2; glass: the live
   surface, chamfered; link: a whole-card link that lifts one level on
   hover. Padding is the card's, 24px; header, content and footer add none. */
const cardVariants = cva(
  "flex flex-col gap-4 border text-card-foreground",
  {
    variants: {
      variant: {
        panel: "border-edge bg-s1 p-6 shadow-[inset_0_1px_0_var(--color-edge-hi)]",
        recessed: "border-edge bg-s0 p-6",
        raised: "border-edge bg-s2 p-6 shadow-[inset_0_1px_0_var(--color-edge-hi)]",
        glass: "chamfer border-0 p-6 text-ink",
        link: "border-edge bg-s1 p-0 no-underline transition-[background-color,border-color] duration-1 ease-out hover:border-edge-strong hover:bg-s2 focus-visible:outline-2 focus-visible:outline-ring",
      },
    },
    defaultVariants: { variant: "panel" },
  }
)

function Card({
  className,
  variant = "panel",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:border-edge [.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("type-legend", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("font-body text-small text-ink-2", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-3 [.border-t]:border-edge [.border-t]:pt-4", className)}
      {...props}
    />
  )
}

export {
  cardVariants,
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
