import * as React from "react"
import { Search, X, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

/**
 * The house filtering row for index pages (docs/DESIGN_SYSTEM.md section 6,
 * inputs): a debounced search field, and a bar that collapses into a sheet
 * on the phone.
 */

/** An `Input` with a leading search icon and a clear button, debounced. */
function SearchField({
  className,
  value,
  onChange,
  debounceMs = 200,
  placeholder = "Search",
  ...props
}: Omit<React.ComponentProps<"input">, "onChange" | "value"> & {
  value: string
  onChange: (value: string) => void
  debounceMs?: number
}) {
  const [local, setLocal] = React.useState(value)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  React.useEffect(() => setLocal(value), [value])

  const commit = (next: string) => {
    setLocal(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(next), debounceMs)
  }

  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return (
    <div data-slot="search-field" className={cn("relative min-w-[12rem] flex-1", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
      <Input
        type="search"
        value={local}
        placeholder={placeholder}
        onChange={(e) => commit(e.target.value)}
        className="pl-10 pr-9 [&::-webkit-search-cancel-button]:appearance-none"
        {...props}
      />
      {local ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-1/2 right-1 -translate-y-1/2"
          onClick={() => commit("")}
        >
          <X className="size-3.5" />
          <span className="sr-only">Clear search</span>
        </Button>
      ) : null}
    </div>
  )
}

/**
 * A wrapping row: the search field growing, then filter children, then a
 * "Clear" ghost button that appears only when `active`. Collapses into a
 * `Sheet` under `sm`.
 */
function FilterBar({
  className,
  children,
  search,
  active = false,
  onClear,
  sheetTitle = "Filters",
  activeCount,
  ...props
}: React.ComponentProps<"div"> & {
  search?: React.ReactNode
  active?: boolean
  onClear?: () => void
  sheetTitle?: React.ReactNode
  activeCount?: number
}) {
  return (
    <div data-slot="filter-bar" className={cn("flex flex-wrap items-center gap-3", className)} {...props}>
      {search}

      <div className="hidden flex-wrap items-center gap-3 sm:flex">
        {children}
        {active ? (
          <Button type="button" variant="ghost" onClick={onClear}>
            Clear
          </Button>
        ) : null}
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button type="button" variant="secondary" className="sm:hidden">
            <SlidersHorizontal className="size-4" />
            {sheetTitle}
            {activeCount ? (
              <Badge variant="ok" className="ml-1">{activeCount}</Badge>
            ) : null}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[80vh]">
          <SheetHeader>
            <SheetTitle className="type-legend">{sheetTitle}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
            {children}
            {active ? (
              <Button type="button" variant="ghost" onClick={onClear} className="self-start">
                Clear
              </Button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export { SearchField, FilterBar }
