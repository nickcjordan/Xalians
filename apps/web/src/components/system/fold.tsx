import * as React from "react"
import { cn } from "@/lib/utils"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"

/**
 * One collapsible pattern for the whole site (docs/DESIGN_SYSTEM.md section
 * 6, "Fold" in the encyclopedia polish vocabulary table): a level 0 surface,
 * a legend label at left, an optional count at the right in the data face,
 * the chevron, content padded on the 4px scale. Built on the Accordion
 * primitive so it inherits its keyboard and ARIA behavior.
 *
 * Folds never nest. A `Fold` inside a `Fold`'s content is not supported by
 * this component on purpose -- two levels of the same disclosure pattern
 * reads as one thing hiding inside another, not as a section. If a nested
 * fold feels necessary, the content underneath needs its own section head
 * instead.
 */
function Fold({
  className,
  label,
  count,
  hint,
  defaultOpen = false,
  children,
  id,
  ...props
}: React.ComponentProps<"div"> & {
  label: React.ReactNode
  count?: React.ReactNode
  /** One line under the label, in body type: a teaser for what the fold holds. */
  hint?: React.ReactNode
  defaultOpen?: boolean
  id?: string
}) {
  const value = id || "fold"
  return (
    <div
      data-slot="fold"
      className={cn("surface-0 border border-edge bg-s0", className)}
      {...props}
    >
      <Accordion type="single" collapsible defaultValue={defaultOpen ? value : undefined}>
        <AccordionItem value={value} className="border-b-0">
          <AccordionTrigger className="min-w-0 gap-3 rounded-none px-5 py-4 text-left no-underline hover:no-underline focus-visible:ring-2 focus-visible:ring-viable focus-visible:ring-offset-2 focus-visible:ring-offset-s0 [&>svg]:text-ink-3">
            <span className="min-w-0 flex-1">
              <span className="type-legend block">{label}</span>
              {hint != null ? <span className="mt-1 block truncate font-body text-small text-ink-2">{hint}</span> : null}
            </span>
            {count != null ? <span className="type-data shrink-0 text-small text-ink-2">{count}</span> : null}
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-5 pb-5">{children}</div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

/** Stacks Folds with a consistent gap. Folds never nest inside one another. */
function FoldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="fold-group" className={cn("flex flex-col gap-2", className)} {...props} />
}

export { Fold, FoldGroup }
