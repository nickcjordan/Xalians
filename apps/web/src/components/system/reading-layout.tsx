import * as React from "react"
import { cn } from "@/lib/utils"
import { Fold } from "@/components/system/fold"

/**
 * Shape C, the reading layout (docs/design/encyclopedia-polish-plan-2026-09-19.md
 * "Shape C: the reading layout"; docs/DESIGN_SYSTEM.md section 6): a
 * three-track grid for prose with a navigation rail and marginalia, used by
 * a story part and by a world's History section.
 *
 * `ReadingLayout` lays down the grid: a 240px rail column, a 62ch text
 * column, and a marginalia column that takes the rest. Its children are one
 * `ReadingRail` plus any number of `ReadingBlock`s (or any element that sets
 * its own `grid-column`).
 *
 * `ReadingRail` is the sticky nav column. From `lg` it pins to the viewport
 * and scrolls its own overflow; under `lg` it collapses into a `Fold` (the
 * `label` prop is the fold's label, e.g. "Part 6 of 7") stacked above the
 * text column.
 *
 * `ReadingBlock` is one row of the reading: `text` in the middle column,
 * `margin` (optional) in the third column, both `items-start`. Under `lg`
 * the margin renders ABOVE the text as a compact wrapping row. `span="wide"`
 * spans the text and margin columns as one piece of content -- pass
 * `children` instead of `text`/`margin` for it (a plate, a section head).
 * `span="text"` (the default) keeps `text` to the text column and `margin`,
 * if given, to the margin column. `divided` draws a hairline above the block
 * and adds vertical padding, for blocks that read as a list of rows (e.g.
 * records paragraphs).
 */
function ReadingLayout({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="reading-layout"
      className={cn(
        "grid grid-cols-1 gap-x-8 gap-y-0 lg:grid-cols-[240px_minmax(0,62ch)_minmax(0,1fr)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function ReadingRail({
  className,
  label,
  hint,
  children,
  ...props
}: React.ComponentProps<"div"> & { label: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div
      data-slot="reading-rail"
      className={cn(
        "mb-6 lg:col-start-1 lg:row-span-full lg:mb-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-48px)] lg:self-start lg:overflow-y-auto",
        className
      )}
      {...props}
    >
      <div className="hidden lg:block">{children}</div>
      <Fold label={label} hint={hint} className="lg:hidden">
        {children}
      </Fold>
    </div>
  )
}

type ReadingBlockProps = React.ComponentProps<"div"> & {
  text?: React.ReactNode
  margin?: React.ReactNode
  span?: "text" | "wide"
  divided?: boolean
}

/**
 * Under `lg` this is a single stacked column (margin above text, in that
 * DOM order so it reads first); from `lg` it drops back into the parent
 * ReadingLayout's own grid tracks via `display: contents` on the wrapper,
 * so `text` and `margin` are placed directly onto the layout's column 2
 * (and 3, for `margin`) through their own `lg:col-start`. `span="wide"`
 * drops `margin` and spans `children` across columns 2 and 3 instead, for
 * one piece of content that is not a text/margin pair (a plate, a section
 * head). `divided` puts the same hairline-plus-padding on every rendered
 * piece so the rule reads as one line across the row even though it is
 * drawn as separate elements sharing a top edge.
 */
function ReadingBlock({ className, text, margin, span = "text", divided = false, children, ...props }: ReadingBlockProps) {
  const dividerClass = divided && "border-t border-edge first:border-t-0"

  if (span === "wide") {
    return (
      <div data-slot="reading-block" data-span="wide" className={cn("contents", className)} {...props}>
        <div className={cn("py-4 lg:col-start-2 lg:col-end-4", dividerClass)}>{children}</div>
      </div>
    )
  }

  return (
    <div data-slot="reading-block" data-span="text" className={cn("contents", className)} {...props}>
      {margin != null ? (
        <div
          className={cn(
            "order-1 flex flex-wrap items-center gap-3 pt-4 first:pt-0 lg:order-none lg:col-start-3 lg:flex-col lg:items-start lg:gap-2 lg:self-start lg:py-4 lg:first:pt-4",
            dividerClass
          )}
        >
          {margin}
        </div>
      ) : null}
      <div className={cn("order-2 min-w-0 self-start py-4 lg:order-none lg:col-start-2", dividerClass)}>{text}</div>
    </div>
  )
}

export { ReadingLayout, ReadingRail, ReadingBlock }
