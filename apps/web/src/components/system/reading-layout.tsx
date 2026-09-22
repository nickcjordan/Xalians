import * as React from "react"
import { cn } from "@/lib/utils"
import { Fold } from "@/components/system/fold"

/**
 * Shape C, the reading layout (docs/design/encyclopedia-polish-plan-2026-09-19.md
 * "Shape C: the reading layout"; docs/DESIGN_SYSTEM.md section 6): a
 * three-track grid for prose with a navigation rail and marginalia, used by
 * a story part and by a world's History section.
 *
 * `ReadingLayout` lays down a two-track grid from `lg`: a 240px rail column,
 * and a second column holding every `ReadingBlock` in document order. Its
 * children are one `ReadingRail` plus any number of `ReadingBlock`s.
 *
 * Each `ReadingBlock` is its OWN row -- it is a single grid item in the
 * layout's second column, not a `display: contents` wrapper whose children
 * are auto-placed onto the layout's own grid tracks. A `contents` wrapper
 * could not guarantee that a block's `margin` landed next to that same
 * block's `text`: a block with no `margin` left a gap in the grid's implicit
 * row that the NEXT block's `margin` could drift up into, and under a
 * single-column mobile grid the auto-placement algorithm could reorder
 * children entirely out of DOM order. `ReadingBlock` instead carries its own
 * inner grid (`xl:grid-cols-[minmax(0,62ch)_minmax(0,1fr)]`, identical across
 * every block so the text track still lines up down the page) with `text` in
 * the first cell and `margin` in the second -- so alignment is guaranteed by
 * construction, not by two independent elements landing in the same
 * auto-placed row.
 *
 * `ReadingRail` is the sticky nav column. From `lg` it pins to the viewport
 * and scrolls its own overflow; under `lg` it collapses into a `Fold` (the
 * `label` prop is the fold's label, e.g. "Part 6 of 7") stacked above the
 * text column.
 *
 * `ReadingBlock` is one row of the reading: `text` in the first inner-grid
 * cell, `margin` (optional) in the second, both `items-start`. Under `lg`
 * the margin renders ABOVE the text as a compact wrapping row. `span="wide"`
 * collapses the inner grid to one column and renders `children` across the
 * full width instead of `text`/`margin` (a plate, a section head).
 * `span="text"` (the default) keeps `text` in the first cell and `margin`,
 * if given, in the second. `divided` draws a hairline above the block and
 * adds vertical padding, for blocks that read as a list of rows (e.g.
 * records paragraphs).
 */
function ReadingLayout({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="reading-layout"
      className={cn("grid grid-cols-1 gap-x-8 gap-y-0 lg:grid-cols-[240px_minmax(0,1fr)]", className)}
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

function ReadingBlock({ className, text, margin, span = "text", divided = false, children, ...props }: ReadingBlockProps) {
  const dividerClass = divided && "border-t border-edge first:border-t-0"

  if (span === "wide") {
    return (
      <div
        data-slot="reading-block"
        data-span="wide"
        className={cn("py-4 lg:col-start-2", dividerClass, className)}
        {...props}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      data-slot="reading-block"
      data-span="text"
      className={cn(
        "grid grid-cols-1 gap-y-3 py-4 lg:col-start-2 xl:grid-cols-[minmax(0,62ch)_minmax(0,1fr)] xl:gap-x-8 xl:gap-y-0",
        dividerClass,
        className
      )}
      {...props}
    >
      {margin != null ? (
        <div className="order-1 flex flex-wrap items-center gap-3 lg:order-2 lg:flex-col lg:items-start lg:gap-2 lg:self-start">
          {margin}
        </div>
      ) : null}
      <div className="order-2 min-w-0 self-start lg:order-1">{text}</div>
    </div>
  )
}

export { ReadingLayout, ReadingRail, ReadingBlock }
