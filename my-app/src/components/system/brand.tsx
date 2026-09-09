import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * The brand (docs/DESIGN_SYSTEM.md section 8): the DNA mark, the helix
 * spinner made from it, and the lockup. Paths from
 * src/svg/logo/xalians_dna_logo.svg. Stroke rules live in globals.css
 * (.helix, .helix-spinner) because SVG strokes cannot read utilities.
 */

const STRANDS = [
  "M-653.6,842.22c-1.65-1.59-12.81-6.83-17.46-9,23.9-17.4,17.56-64.41,17.56-64.41H-628C-628,807.81-640.29,829.71-653.6,842.22Z",
  "M-732.58,856.85a50.41,50.41,0,0,0,16.92,7.91C-731.89,883-730.5,926-730.5,926H-756S-750.6,883.43-732.58,856.85Z",
  "M-730.5,768.78C-741.25,880.57-643,790.18-628,926H-653.5c-9-115.36-102-19.15-102.53-157.22Z",
]

function HelixPaths({ rungStyle }: { rungStyle?: (i: number) => React.CSSProperties }) {
  const rs = (i: number) => (rungStyle ? rungStyle(i) : undefined)
  return (
    <>
      <g transform="translate(758.03 -766.78)">
        {STRANDS.map((d) => (
          <path key={d} className="strand" d={d} />
        ))}
        <path className="rung" style={rs(0)} d="M-722,777.85h38.87" />
        <path className="rung" style={rs(0)} d="M-671,777.85h8.39" />
      </g>
      <line className="rung" style={rs(1)} x1="37.16" y1="29.9" x2="93.65" y2="29.9" />
      <line className="rung" style={rs(2)} x1="45.18" y1="48.73" x2="86.61" y2="48.73" />
      <line className="rung" style={rs(3)} x1="45.22" y1="115.28" x2="78.03" y2="115.28" />
      <g transform="translate(758.03 -766.78)">
        <path className="rung" style={rs(4)} d="M-716.83,900.89H-709" />
        <path className="rung" style={rs(4)} d="M-697,900.89h26.41" />
      </g>
      <line className="rung" style={rs(5)} x1="39.41" y1="152.87" x2="91.03" y2="153.01" />
    </>
  )
}

/** The DNA mark alone. Size it with a height class; it keeps its ratio. */
function HelixMark({ className, title = "Xalians", ...props }: React.ComponentProps<"svg"> & { title?: string }) {
  return (
    <svg
      data-slot="helix-mark"
      className={cn("helix block h-7 w-auto overflow-visible", className)}
      viewBox="-6 -6 144 173"
      role="img"
      aria-label={title}
      {...props}
    >
      <title>{title}</title>
      <HelixPaths />
    </svg>
  )
}

const SPINNER_SIZE = { sm: "w-5", md: "w-8", lg: "w-14" } as const

/** Loading: the mark with its rungs lighting in sequence. Never a skeleton. */
function HelixSpinner({
  className,
  size = "md",
  label = "Loading",
  ...props
}: React.ComponentProps<"svg"> & { size?: keyof typeof SPINNER_SIZE; label?: string }) {
  return (
    <svg
      data-slot="helix-spinner"
      className={cn("helix-spinner block h-auto overflow-visible", SPINNER_SIZE[size], className)}
      viewBox="-6 -6 144 173"
      role="status"
      aria-label={label}
      {...props}
    >
      <HelixPaths rungStyle={(i) => ({ "--i": i } as React.CSSProperties)} />
    </svg>
  )
}

/** The lockup: mark, then the word in the brand face, both in viable-hi. */
function BrandLockup({
  className,
  big = false,
  href = "/",
  ...props
}: React.ComponentProps<"a"> & { big?: boolean }) {
  return (
    <a
      data-slot="brand-lockup"
      href={href}
      className={cn(
        "inline-flex items-center font-brand uppercase leading-none text-viable-hi no-underline hover:text-viable-hi",
        big ? "gap-3.5 text-[40px] sm:gap-5 sm:text-[64px]" : "gap-2.5 text-[22px]",
        className
      )}
      {...props}
    >
      <HelixMark className={big ? "h-[52px] sm:h-[84px]" : "h-7"} />
      <span>Xalians</span>
    </a>
  )
}

export { HelixMark, HelixSpinner, BrandLockup }
