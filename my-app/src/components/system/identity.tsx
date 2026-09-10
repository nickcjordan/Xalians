import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * A person or account identity row (docs/DESIGN_SYSTEM.md section 6).
 * TODO(integrator): swap the initials square for @/components/ui/avatar
 * once the primitives agent's branch lands it — it is not on this branch yet.
 */
function IdentityRow({
  className,
  name,
  detail,
  initials,
  ...props
}: React.ComponentProps<"div"> & { name: React.ReactNode; detail?: React.ReactNode; initials: string }) {
  return (
    <div data-slot="identity-row" className={cn("flex items-center gap-3", className)} {...props}>
      <span
        aria-hidden="true"
        className="type-data grid size-8 shrink-0 place-items-center border border-edge bg-s2 text-[12px] text-ink-2"
      >
        {initials.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="type-legend m-0 truncate text-ink">{name}</p>
        {detail ? <p className="m-0 truncate font-body text-small text-ink-2">{detail}</p> : null}
      </div>
    </div>
  )
}

export { IdentityRow }
