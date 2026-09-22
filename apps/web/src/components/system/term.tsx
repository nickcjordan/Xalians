import * as React from "react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"

/**
 * A visitor-facing label with its definition one tap or focus away
 * (docs/DESIGN_SYSTEM.md sections 1, 2, 10, 10.1). Used for internal
 * vocabulary that reaches the visitor undefined: registry fields on a
 * record, a species record, or a world record.
 *
 * Wraps the label in a focusable element so the tooltip opens on focus as
 * well as hover (the shadcn `Tooltip` primitive, on Radix, already does
 * this) and exposes the definition to the accessibility tree.
 *
 * Carries its own `TooltipProvider` (Radix nests providers safely) so a
 * `Term` works wherever it is dropped - inside the app shell, which already
 * has one, and in a component test that renders a record view in isolation.
 */
function Term({
  children,
  definition,
  className,
}: {
  children: React.ReactNode
  definition: React.ReactNode
  className?: string
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            data-slot="term"
            className={cn(
              // An 18px dotted word is a poor thumb target. The button is
              // inline-block, so vertical padding grows the hit area without
              // moving the text. The padding is negative-margined back out so
              // a term in a label column keeps the same rhythm as the plain
              // labels beside it, and it is dropped from sm up where a
              // pointer is assumed.
              "cursor-help border-0 border-b border-dotted border-ink-3 bg-transparent p-0 font-[inherit] text-[inherit] underline-offset-2 max-sm:-my-2 max-sm:py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              className
            )}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[26ch] text-small">{definition}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export { Term }
