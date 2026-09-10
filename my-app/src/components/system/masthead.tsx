import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * The core frame (docs/DESIGN_SYSTEM.md section 2): every page is navbar,
 * Shell, Masthead, then its objects at full shell width. One title per
 * page, in the masthead, never repeated below it.
 */
function Shell({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="shell"
      className={cn("mx-auto w-full max-w-[1440px] px-6", className)}
      {...props}
    />
  )
}

type MastheadProps = React.ComponentProps<"header"> & {
  /** The legend above the title: the area or record type. */
  kicker: React.ReactNode
  title: React.ReactNode
  /** One line under the title: a count, a pronunciation, a sentence. */
  subtitle?: React.ReactNode
  /** Chips or a badge beside the title. */
  beside?: React.ReactNode
  /** The right-hand slot: at most one primary key, plus a secondary. */
  aside?: React.ReactNode
}

function Masthead({ className, kicker, title, subtitle, beside, aside, ...props }: MastheadProps) {
  return (
    <header
      data-slot="masthead"
      className={cn(
        "mt-8 mb-6 flex flex-wrap items-end justify-between gap-4 md:flex-row",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <p className="type-legend m-0">{kicker}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="type-title m-0">{title}</h1>
          {beside}
        </div>
        {subtitle ? <div className="m-0 max-w-[62ch] font-body text-body text-ink-2">{subtitle}</div> : null}
      </div>
      {aside ? (
        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto [&>*]:flex-1 md:[&>*]:flex-none">
          {aside}
        </div>
      ) : null}
    </header>
  )
}

/** A section head inside a page: heading 24, optional count in the data face. */
function SectionHead({
  className,
  title,
  count,
  children,
  ...props
}: React.ComponentProps<"div"> & { title: React.ReactNode; count?: React.ReactNode }) {
  return (
    <div data-slot="section-head" className={cn("mb-4 flex items-baseline gap-3", className)} {...props}>
      <h2 className="type-heading m-0">{title}</h2>
      {count != null ? <span className="type-data text-small text-ink-2">{count}</span> : null}
      {children}
    </div>
  )
}

export { Shell, Masthead, SectionHead }
