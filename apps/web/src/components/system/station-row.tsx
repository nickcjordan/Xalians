import * as React from "react"
import { Link } from "react-router"
import { cn } from "@/lib/utils"
import { tabTriggerClass } from "@/components/ui/tabs"

/**
 * The pressed-segment row (docs/DESIGN_SYSTEM.md section 6, "Station row" in
 * the encyclopedia polish vocabulary table): the same look and keyboard
 * behavior already used three times before this file existed -- the era
 * scrubber, the Bestiary element row, the Index category row. `centerInRail`
 * lives here now (moved from `encyclopedia/railScroll.js`, which re-exports
 * it for the callers that have not migrated to `Station`/`StationRow` yet).
 */

/** Center an element inside a horizontally scrolling rail without moving the page. */
export function centerInRail(rail: HTMLElement | null, el: Element | null) {
  if (!rail || !el) return
  if (rail.scrollWidth <= rail.clientWidth) return
  const target = (el as HTMLElement).offsetLeft - (rail.clientWidth - (el as HTMLElement).offsetWidth) / 2
  rail.scrollLeft = Math.max(0, target)
}

type StationProps = React.ComponentProps<"button"> & {
  to?: string
  active?: boolean
  count?: React.ReactNode
  disabled?: boolean
}

/** One station: a button, or a `Link` when `to` is given. */
function Station({ className, to, active = false, count, disabled = false, children, ...props }: StationProps) {
  const content = (
    <>
      <span>{children}</span>
      {count != null ? <span className="type-data text-[11px] text-ink-3">{count}</span> : null}
    </>
  )
  const stateProps = { "data-state": active ? "active" : "inactive", "aria-pressed": active } as const
  const cls = cn(tabTriggerClass, "max-sm:shrink-0 gap-1.5", disabled && "pointer-events-none text-ink-3", className)

  if (to && !disabled) {
    return (
      <Link data-slot="station" to={to} className={cls} aria-current={active ? "page" : undefined} {...(props as unknown as React.ComponentProps<typeof Link>)}>
        {content}
      </Link>
    )
  }

  return (
    <button data-slot="station" type="button" className={cls} disabled={disabled} {...stateProps} {...props}>
      {content}
    </button>
  )
}

type StationRowProps<T extends string | null> = {
  className?: string
  value: T
  onChange: (value: T) => void
  "aria-label": string
  children: React.ReactNode
}

/**
 * A `role="group"` rail of `Station`s: wraps from `sm`, scrolls with a
 * right-edge mask below it, keeps the active station centered in view, and
 * moves the current selection with the left/right arrow keys.
 */
function StationRow<T extends string | null = string>({ className, value, onChange, children, ...props }: StationRowProps<T>) {
  const railRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const active = rail.querySelector('[data-state="active"]')
    centerInRail(rail, active)
  }, [value])

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
    const rail = railRef.current
    if (!rail) return
    const stations = Array.from(rail.querySelectorAll<HTMLElement>('[data-slot="station"]:not([disabled])'))
    if (stations.length === 0) return
    const currentIndex = stations.findIndex((s) => s.getAttribute("data-state") === "active")
    const current = currentIndex >= 0 ? currentIndex : 0
    const delta = e.key === "ArrowRight" ? 1 : -1
    const next = (current + delta + stations.length) % stations.length
    e.preventDefault()
    stations[next].focus()
  }

  return (
    <div
      data-slot="station-row"
      ref={railRef}
      role="group"
      className={cn(
        "flex flex-wrap gap-0.5 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-40px),transparent)]",
        className
      )}
      onKeyDown={onKeyDown}
      {...props}
    >
      {children}
    </div>
  )
}

export { Station, StationRow }
