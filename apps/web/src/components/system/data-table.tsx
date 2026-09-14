import * as React from "react"
import { Link } from "react-router"
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { EmptyState } from "@/components/system/record"

/**
 * A typed table on the `Table` primitive (docs/DESIGN_SYSTEM.md section 6):
 * sortable columns as real header buttons, an optional row link, an
 * optional selectable mode, and an `EmptyState` when `rows` is empty. Stays
 * a table under `sm`, inside `overflow-x-auto` (the primitive already
 * wraps it); it does not collapse into cards.
 */

type Align = "start" | "end"

type Column<T> = {
  key: string
  header: React.ReactNode
  cell?: (row: T) => React.ReactNode
  sortable?: boolean
  align?: Align
}

type Sort = { key: string; direction: "asc" | "desc" } | null

function DataTable<T extends { id?: React.Key }>({
  className,
  columns,
  rows,
  getRowId = (row: T, i: number) => (row.id != null ? row.id : i),
  sort,
  defaultSort = null,
  onSortChange,
  rowLink,
  selectable = false,
  selected,
  onSelectedChange,
  empty,
  emptyLegend = "No records",
  emptyMessage = "Nothing matches yet.",
}: {
  className?: string
  columns: Column<T>[]
  rows: T[]
  getRowId?: (row: T, index: number) => React.Key
  sort?: Sort
  defaultSort?: Sort
  onSortChange?: (sort: Sort) => void
  rowLink?: (row: T) => string
  selectable?: boolean
  selected?: Set<React.Key>
  onSelectedChange?: (selected: Set<React.Key>) => void
  empty?: React.ReactNode
  emptyLegend?: React.ReactNode
  emptyMessage?: React.ReactNode
}) {
  const [internalSort, setInternalSort] = React.useState<Sort>(defaultSort)
  const [internalSelected, setInternalSelected] = React.useState<Set<React.Key>>(new Set())
  const activeSort = sort !== undefined ? sort : internalSort
  const activeSelected = selected ?? internalSelected

  const setSort = (next: Sort) => {
    if (onSortChange) onSortChange(next)
    else setInternalSort(next)
  }
  const setSelected = (next: Set<React.Key>) => {
    if (onSelectedChange) onSelectedChange(next)
    else setInternalSelected(next)
  }

  const toggleSort = (col: Column<T>) => {
    if (!col.sortable) return
    if (!activeSort || activeSort.key !== col.key) setSort({ key: col.key, direction: "asc" })
    else if (activeSort.direction === "asc") setSort({ key: col.key, direction: "desc" })
    else setSort(null)
  }

  const sortedRows = React.useMemo(() => {
    if (!activeSort) return rows
    const col = columns.find((c) => c.key === activeSort.key)
    if (!col) return rows
    const factor = activeSort.direction === "asc" ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = col.cell ? col.cell(a) : (a as Record<string, unknown>)[col.key]
      const bv = col.cell ? col.cell(b) : (b as Record<string, unknown>)[col.key]
      if (av == null && bv == null) return 0
      if (av == null) return -1 * factor
      if (bv == null) return 1 * factor
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * factor
    })
  }, [rows, activeSort, columns])

  if (rows.length === 0) {
    return empty ?? <EmptyState legend={emptyLegend}>{emptyMessage}</EmptyState>
  }

  const allSelected = selectable && sortedRows.length > 0 && sortedRows.every((r, i) => activeSelected.has(getRowId(r, i)))

  return (
    <div data-slot="data-table" className={className}>
      {selectable && activeSelected.size > 0 ? (
        <p className="type-data mb-2 text-small text-ink-2">{activeSelected.size} selected</p>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow className="border-edge hover:bg-transparent">
            {selectable ? (
              <TableHead className="w-10 whitespace-nowrap px-3 text-ink-2">
                <Checkbox
                  aria-label="Select all rows"
                  checked={allSelected}
                  onCheckedChange={(checked: boolean | "indeterminate") => {
                    const next = new Set<React.Key>()
                    if (checked) sortedRows.forEach((r, i) => next.add(getRowId(r, i)))
                    setSelected(next)
                  }}
                />
              </TableHead>
            ) : null}
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  "type-legend h-10 border-b border-edge px-3 text-ink-2",
                  col.align === "end" && "text-right"
                )}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(col)}
                    className={cn(
                      "type-legend inline-flex items-center gap-1 text-ink-2 outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      col.align === "end" && "flex-row-reverse"
                    )}
                  >
                    {col.header}
                    {activeSort?.key === col.key ? (
                      activeSort.direction === "asc" ? (
                        <ArrowUp className="size-3.5" />
                      ) : (
                        <ArrowDown className="size-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3.5 opacity-50" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row, i) => {
            const id = getRowId(row, i)
            const href = rowLink?.(row)
            const isSelected = activeSelected.has(id)
            return (
              <TableRow
                key={id}
                data-state={isSelected ? "selected" : undefined}
                className={cn(
                  "border-edge",
                  href && "hover:bg-s1",
                  isSelected && "bg-viable-tint"
                )}
              >
                {selectable ? (
                  <TableCell className="px-3">
                    <Checkbox
                      aria-label="Select row"
                      checked={isSelected}
                      onCheckedChange={(checked: boolean | "indeterminate") => {
                        const next = new Set(activeSelected)
                        if (checked) next.add(id)
                        else next.delete(id)
                        setSelected(next)
                      }}
                    />
                  </TableCell>
                ) : null}
                {columns.map((col) => {
                  const content = col.cell ? col.cell(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode
                  return (
                    <TableCell
                      key={col.key}
                      className={cn("type-data px-3 text-small text-ink", col.align === "end" && "text-right", href && "relative")}
                    >
                      {href ? (
                        <Link to={href} className="absolute inset-0" aria-label={String(content)} />
                      ) : null}
                      <span className="relative">{content}</span>
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export { DataTable }
export type { Column, Sort }
