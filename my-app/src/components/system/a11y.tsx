import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Accessibility primitives (docs/DESIGN_SYSTEM.md section 6, "Focus is
 * always visible"). Convention: every page's main landmark is
 * `<main id="main">`; `SkipLink` targets it.
 */

/** Visually hidden until focused, then a level-2 box with the focus ring. */
function SkipLink({ className, children = "Skip to content", href = "#main", ...props }: React.ComponentProps<"a">) {
  return (
    <a
      data-slot="skip-link"
      href={href}
      className={cn(
        "sr-only z-50 border border-edge-strong bg-s2 px-4 py-2 font-legend text-legend uppercase tracking-legend text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
      {...props}
    >
      {children}
    </a>
  )
}

/** A span present for assistive tech only, invisible on screen. */
function VisuallyHidden({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="visually-hidden" className={cn("sr-only", className)} {...props} />
}

/** An `aria-live="polite"` region for announcements that are otherwise silent. */
function LiveRegion({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="live-region"
      role="status"
      aria-live="polite"
      className={cn("sr-only", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { SkipLink, VisuallyHidden, LiveRegion }
