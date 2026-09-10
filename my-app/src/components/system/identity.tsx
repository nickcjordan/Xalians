import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

/**
 * A person or account identity row (docs/DESIGN_SYSTEM.md section 6): the
 * Avatar (image, or initials on s2), the name in the legend face, a detail line.
 */
function IdentityRow({
  className,
  name,
  detail,
  initials,
  src,
  size = "md",
  ...props
}: React.ComponentProps<"div"> & { name: React.ReactNode; detail?: React.ReactNode; initials: string; src?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <div data-slot="identity-row" className={cn("flex items-center gap-3", className)} {...props}>
      <Avatar size={size} className="shrink-0" aria-hidden="true">
        {src ? <AvatarImage src={src} alt="" /> : null}
        <AvatarFallback>{initials.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="type-legend m-0 truncate text-ink">{name}</p>
        {detail ? <p className="m-0 truncate font-body text-small text-ink-2">{detail}</p> : null}
      </div>
    </div>
  )
}

export { IdentityRow }
