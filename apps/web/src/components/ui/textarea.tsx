import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full border border-edge-strong bg-s0 px-4 py-3 font-body text-body text-ink transition-[border-color] duration-1 ease-out outline-none placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring aria-invalid:border-plague aria-invalid:bg-plague-tint disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
