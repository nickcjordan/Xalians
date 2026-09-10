import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * A horizontal (stacked under `sm`) rail of numbered square markers
 * (docs/DESIGN_SYSTEM.md section 6, control states). Controlled by `value`,
 * the 0-based index of the current step among its `Step` children.
 */

type StepperContextValue = { value: number; count: number }
const StepperContext = React.createContext<StepperContextValue>({ value: 0, count: 1 })

function Stepper({
  className,
  value,
  children,
  ...props
}: React.ComponentProps<"ol"> & { value: number }) {
  const count = React.Children.count(children)
  return (
    <StepperContext.Provider value={{ value, count }}>
      <ol
        data-slot="stepper"
        className={cn(
          "m-0 flex list-none flex-col gap-4 p-0 sm:flex-row sm:items-center sm:gap-0",
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child, i) =>
          React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<StepProps>, { index: i })
            : child
        )}
      </ol>
    </StepperContext.Provider>
  )
}

type StepProps = React.ComponentProps<"li"> & { label: React.ReactNode; index?: number }

function Step({ className, label, index = 0, ...props }: StepProps) {
  const { value, count } = React.useContext(StepperContext)
  const status = index < value ? "done" : index === value ? "current" : "upcoming"
  const isLast = index === count - 1

  return (
    <li
      data-slot="step"
      data-status={status}
      aria-current={status === "current" ? "step" : undefined}
      className={cn("flex items-center gap-3 sm:flex-1", className)}
      {...props}
    >
      <span
        className={cn(
          "type-data flex size-6 shrink-0 items-center justify-center border text-[12px]",
          status === "done" && "border-viable bg-viable text-room",
          status === "current" && "border-viable text-ink",
          status === "upcoming" && "border-edge-strong text-ink-3"
        )}
      >
        {status === "done" ? <Check className="size-3.5" /> : index + 1}
      </span>
      <span className={cn("type-legend whitespace-nowrap", status === "upcoming" ? "text-ink-3" : "text-ink")}>
        {label}
      </span>
      {!isLast ? (
        <span
          aria-hidden="true"
          className={cn("mx-2 hidden h-px flex-1 sm:block", status === "done" ? "bg-viable" : "bg-edge")}
        />
      ) : null}
    </li>
  )
}

export { Stepper, Step }
