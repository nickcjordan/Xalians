import * as React from "react"
import { cn } from "@/lib/utils"
import { cardVariants } from "@/components/ui/card"

/**
 * Printed data (docs/DESIGN_SYSTEM.md section 6): a spec plate of key/value
 * pairs, record rows on hairlines, the stat meter, the move set, the empty
 * state. Keys in the legend face on the second ink; values in the data face.
 */

type SpecEntry = { key: React.ReactNode; value: React.ReactNode; body?: boolean }

/** Key/value pairs as one table. `columns` 2 lays the pairs out two across. */
function SpecPlate({
  className,
  entries,
  columns = 1,
  ...props
}: React.ComponentProps<"dl"> & { entries: SpecEntry[]; columns?: 1 | 2 }) {
  return (
    <dl
      data-slot="spec-plate"
      className={cn(
        "m-0 grid items-baseline gap-x-6 gap-y-2",
        columns === 2
          ? "grid-cols-[minmax(7rem,max-content)_minmax(0,1fr)] md:grid-cols-[minmax(9rem,max-content)_minmax(0,1fr)_minmax(9rem,max-content)_minmax(0,1fr)]"
          : "grid-cols-[minmax(7rem,max-content)_minmax(0,1fr)]",
        className
      )}
      {...props}
    >
      {entries.map((e, i) => (
        <React.Fragment key={i}>
          <dt className="type-legend">{e.key}</dt>
          <dd className={cn("m-0 text-small text-ink", e.body ? "font-body" : "type-data")}>{e.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  )
}

/** One term/body row on a hairline. */
function RecordRow({
  className,
  term,
  children,
  ...props
}: React.ComponentProps<"div"> & { term: React.ReactNode }) {
  return (
    <div
      data-slot="record-row"
      className={cn(
        "grid grid-cols-[minmax(8rem,15rem)_1fr] gap-x-6 gap-y-2 border-b border-edge py-3 last:border-b-0",
        className
      )}
      {...props}
    >
      <div className="type-legend text-[13px]">{term}</div>
      <div className="font-body text-small text-ink-2">{children}</div>
    </div>
  )
}

/** A stat meter keyed to the element in scope: name, track, value. */
function Meter({
  className,
  name,
  value,
  max = 1000,
  potential,
  ...props
}: React.ComponentProps<"div"> & { name: React.ReactNode; value: number; max?: number; potential?: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)))
  const ghost = potential != null ? Math.max(0, Math.min(100, Math.round((potential / max) * 100))) : null
  return (
    <div
      data-slot="meter"
      className={cn("grid grid-cols-[7rem_1fr_3.5rem] items-center gap-2 py-1 md:grid-cols-[8.5rem_1fr_3.5rem] md:gap-3", className)}
      {...props}
    >
      <span className="type-legend">{name}</span>
      <div className="relative h-1.5 bg-s0">
        {ghost != null ? <div className="absolute inset-y-0 left-0 bg-el/35" style={{ width: `${ghost}%` }} /> : null}
        <div className="absolute inset-y-0 left-0 bg-el" style={{ width: `${pct}%` }} />
      </div>
      <span className="type-data text-right text-small text-ink">{value}</span>
    </div>
  )
}

type Move = { name: string; rating: number | string; description?: string }

/** The four generated moves as a rated list: rating, name, description. */
function MoveSet({
  className,
  moves,
  clamp,
  ...props
}: React.ComponentProps<"ul"> & { moves: Move[]; clamp?: boolean }) {
  return (
    <ul data-slot="move-set" className={cn("m-0 flex list-none flex-col p-0", className)} {...props}>
      {moves.map((m) => (
        <li
          key={m.name}
          className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-4 border-b border-edge py-3 first:pt-0 last:border-b-0 last:pb-0"
        >
          <span className="type-data min-w-9 text-right text-lead text-ink" title="Move rating">
            {m.rating}
          </span>
          <div className="min-w-0">
            <h3 className="m-0 font-legend text-body font-semibold uppercase tracking-legend text-ink">{m.name}</h3>
            {m.description ? (
              <p className={cn("mt-1 mb-0 font-body text-small text-ink-2", clamp && "truncate")}>{m.description}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

/** A solid hairline box on level 0 with a legend line and one sentence. */
function EmptyState({
  className,
  legend,
  children,
  ...props
}: React.ComponentProps<"div"> & { legend: React.ReactNode }) {
  return (
    <div data-slot="empty-state" className={cn("border border-edge bg-s0 p-6", className)} {...props}>
      <p className="type-legend mb-3">{legend}</p>
      <div className="font-body text-body text-ink-2">{children}</div>
    </div>
  )
}

/**
 * A catalogue tile: a `Card variant="link"` with a 3px element bar, an art
 * plate, and a meta block. `as` lets a router Link wear the card styling
 * (pass `as={Link} to={...}`) so the whole tile is one target.
 */
function Tile({
  as,
  className,
  ...props
}: React.ComponentProps<"a"> & { as?: React.ElementType }) {
  const Comp = (as || "a") as React.ElementType
  return (
    <Comp
      data-slot="tile"
      className={cn(cardVariants({ variant: "link" }), "block overflow-hidden p-0", className)}
      {...props}
    />
  )
}

function TileBar({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="tile-bar" className={cn("h-[3px] bg-el", className)} {...props} />
}

function TileArt({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tile-art"
      className={cn("grid aspect-square place-items-center bg-el/24", className)}
      {...props}
    />
  )
}

function TileMeta({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="tile-meta" className={cn("px-4 pb-4 pt-3", className)} {...props} />
}

export { SpecPlate, RecordRow, Meter, MoveSet, EmptyState, Tile, TileBar, TileArt, TileMeta }
export type { SpecEntry, Move }
