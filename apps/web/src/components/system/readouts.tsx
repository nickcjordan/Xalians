import * as React from "react"
import { TrendingUp, TrendingDown, Info, AlertTriangle, Skull, Sparkles, Copy as CopyIcon } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Printed and summarized data beyond the record primitives in
 * `system/record.tsx` (docs/DESIGN_SYSTEM.md section 6): a value tile, a
 * two-column key/value list, an era timeline, a status callout, and a
 * copyable data block.
 */

/** A big value in the data face, a legend label, and an optional delta. */
function StatTile({
  className,
  value,
  label,
  delta,
  caption,
  ...props
}: React.ComponentProps<"div"> & {
  value: React.ReactNode
  label: React.ReactNode
  delta?: number
  caption?: React.ReactNode
}) {
  const up = typeof delta === "number" && delta > 0
  const down = typeof delta === "number" && delta < 0
  return (
    <div data-slot="stat-tile" className={cn("border border-edge bg-s1 p-4", className)} {...props}>
      <div className="flex items-baseline gap-2">
        <span className="type-data text-[28px] leading-none text-ink">{value}</span>
        {delta != null ? (
          <span
            className={cn(
              "type-data inline-flex items-center gap-0.5 text-small",
              up && "text-viable-hi",
              down && "text-plague-outline-ink"
            )}
          >
            {up ? <TrendingUp className="size-3.5" /> : down ? <TrendingDown className="size-3.5" /> : null}
            {delta > 0 ? `+${delta}` : delta}
          </span>
        ) : null}
      </div>
      <p className="type-legend mt-2 mb-0">{label}</p>
      {caption ? <p className="mt-1 mb-0 font-body text-small text-ink-2">{caption}</p> : null}
    </div>
  )
}

type KVEntry = { term: React.ReactNode; detail: React.ReactNode }

/** A `dt`/`dd` list on hairlines; two columns from `md`. */
function KeyValueList({
  className,
  entries,
  ...props
}: React.ComponentProps<"dl"> & { entries: KVEntry[] }) {
  return (
    <dl data-slot="key-value-list" className={cn("m-0 grid gap-x-8 gap-y-0 md:grid-cols-2", className)} {...props}>
      {entries.map((e, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 border-b border-edge py-2.5">
          <dt className="type-legend">{e.term}</dt>
          <dd className="m-0 type-data text-small text-ink">{e.detail}</dd>
        </div>
      ))}
    </dl>
  )
}

type TimelineItemProps = React.ComponentProps<"li"> & { date: React.ReactNode; title: React.ReactNode }

/** One era on the vertical rail: a legend date, a subhead title, prose body. */
function TimelineItem({ className, date, title, children, ...props }: TimelineItemProps) {
  return (
    <li data-slot="timeline-item" className={cn("relative pb-8 pl-6 last:pb-0", className)} {...props}>
      <span aria-hidden="true" className="absolute top-1.5 left-0 size-2.5 -translate-x-[3px] rounded-full bg-viable" />
      <span aria-hidden="true" className="absolute top-4 bottom-0 left-0 w-px bg-edge last:hidden" />
      <p className="type-legend m-0">{date}</p>
      <h3 className="type-subhead mt-1 mb-2">{title}</h3>
      <div className="font-body text-body text-ink-2">{children}</div>
    </li>
  )
}

function Timeline({ className, children, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol data-slot="timeline" className={cn("m-0 list-none p-0", className)} {...props}>
      {children}
    </ol>
  )
}

const CALLOUT_ICON = { note: Info, caution: AlertTriangle, plague: Skull, viable: Sparkles } as const
const CALLOUT_CLASS = {
  note: "border-l-neutral text-ink",
  caution: "border-l-caution text-ink",
  plague: "border-l-plague text-ink",
  viable: "border-l-viable text-ink",
} as const
const CALLOUT_ICON_CLASS = {
  note: "text-neutral",
  caution: "text-caution",
  plague: "text-plague-outline-ink",
  viable: "text-viable-hi",
} as const

type CalloutVariant = keyof typeof CALLOUT_ICON

/** A left-rule status box: `note`, `caution`, `plague`, `viable`. */
function Callout({
  className,
  variant = "note",
  title,
  children,
  ...props
}: React.ComponentProps<"div"> & { variant?: CalloutVariant; title: React.ReactNode }) {
  const Icon = CALLOUT_ICON[variant]
  return (
    <div
      data-slot="callout"
      data-variant={variant}
      className={cn("flex gap-3 border-l-2 bg-s1 p-4", CALLOUT_CLASS[variant], className)}
      {...props}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", CALLOUT_ICON_CLASS[variant])} />
      <div className="min-w-0">
        <p className="type-legend m-0">{title}</p>
        <div className="measure mt-1 font-body text-small text-ink-2">{children}</div>
      </div>
    </div>
  )
}

/** A monospace block of machine output, with an optional copy button. */
function DataBlock({
  className,
  children,
  copy = false,
  ...props
}: React.ComponentProps<"pre"> & { copy?: boolean }) {
  const text = typeof children === "string" ? children : undefined
  return (
    <div data-slot="data-block" className="relative">
      <pre
        className={cn("type-data overflow-x-auto border border-edge bg-s0 p-4 text-small text-ink", className)}
        {...props}
      >
        {children}
      </pre>
      {copy && text ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-2 right-2"
          onClick={() => {
            navigator.clipboard.writeText(text)
            toast("Copied")
          }}
        >
          <CopyIcon className="size-3.5" />
          <span className="sr-only">Copy</span>
        </Button>
      ) : null}
    </div>
  )
}

export { StatTile, KeyValueList, Timeline, TimelineItem, Callout, DataBlock }
export type { KVEntry, CalloutVariant }
