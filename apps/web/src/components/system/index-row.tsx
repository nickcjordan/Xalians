import * as React from "react"
import { Link } from "react-router"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

/**
 * The one row grammar for a list of records (docs/DESIGN_SYSTEM.md section 6,
 * "Index row" in the encyclopedia polish vocabulary table): a narrow leading
 * column (a number or a kicker), a title in subhead type, one line of copy
 * under it, a meta column at the right in the data face, and a chevron when
 * the row is a link. Used for the Reading Room's four sections, The Story's
 * seven parts, and any other "go read this record" list.
 */
function IndexList({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <Card data-slot="index-list" variant="panel" className={cn("divide-y divide-edge p-0", className)} {...props}>
      {children}
    </Card>
  )
}

type IndexRowProps = React.ComponentProps<"div"> & {
  to?: string
  leading?: React.ReactNode
  title: React.ReactNode
  copy?: React.ReactNode
  meta?: React.ReactNode
}

function IndexRow({ className, to, leading, title, copy, meta, ...props }: IndexRowProps) {
  const content = (
    <>
      <div className="min-w-8 self-baseline type-data text-small text-ink-3">{leading}</div>
      <div className="min-w-0">
        <div className="type-subhead text-base">{title}</div>
        {copy ? <div className="mt-1 font-body text-small text-ink-2">{copy}</div> : null}
      </div>
      <div className="flex items-baseline gap-3 justify-self-end self-baseline">
        {meta ? (
          <span className="type-data whitespace-nowrap text-small text-ink-2 max-sm:whitespace-normal">{meta}</span>
        ) : null}
        {to ? <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-ink-3" /> : null}
      </div>
    </>
  )

  const rowClass = cn(
    "grid min-h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 px-5 py-3 max-sm:grid-cols-[auto_minmax(0,1fr)]",
    "max-sm:[&>*:last-child]:col-span-2 max-sm:[&>*:last-child]:justify-self-start",
    className
  )

  if (to) {
    return (
      <Link data-slot="index-row" to={to} className={cn(rowClass, "no-underline hover:bg-s1")} {...(props as React.ComponentProps<typeof Link>)}>
        {content}
      </Link>
    )
  }

  return (
    <div data-slot="index-row" className={rowClass} {...props}>
      {content}
    </div>
  )
}

export { IndexRow, IndexList }
