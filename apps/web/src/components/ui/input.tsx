import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          "h-11 w-full min-w-0 border border-edge-strong bg-s0 px-4 py-2 font-body text-body text-ink transition-[border-color] duration-1 ease-out outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-ink-3 hover:border-ink-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
          "focus-visible:border-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
          "aria-invalid:border-plague aria-invalid:bg-plague-tint",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
