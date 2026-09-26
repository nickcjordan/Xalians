import * as React from "react"
import { cn } from "@/lib/utils"
import { Fold } from "@/components/system/fold"

/**
 * Tier: chrome. Navigation sits beside one continuous reading column.
 * The rail and body are the only outer grid items, so a tall contents list
 * cannot stretch the first paragraph. Blocks stay in normal document flow.
 * Illustrations and optional reference notes follow their related prose.
 */
function ReadingLayout({ className, rail, children, ...props }: React.ComponentProps<"div"> & { rail: React.ReactNode }) {
  return (
    <div
      data-slot="reading-layout"
      className={cn("mx-auto grid w-full max-w-[calc(62ch+232px)] grid-cols-1 items-start gap-8 font-body text-body lg:grid-cols-[200px_minmax(0,1fr)]", className)}
      {...props}
    >
      {rail}
      <div data-slot="reading-body" className="min-w-0 w-full max-w-[62ch] font-body text-body leading-relaxed">
        {children}
      </div>
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
        "min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-104px)] lg:overflow-y-auto",
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
  const dividerClass = divided && "border-t border-edge pt-6 first:border-t-0"

  if (span === "wide") {
    return (
      <div
        data-slot="reading-block"
        data-span="wide"
        className={cn("mb-6", dividerClass, className)}
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
        "mb-5",
        dividerClass,
        className
      )}
      {...props}
    >
      <div className="min-w-0">{text}</div>
      {margin != null ? (
        <div className="mt-4 text-small text-ink-2">{margin}</div>
      ) : null}
    </div>
  )
}

export { ReadingLayout, ReadingRail, ReadingBlock }
