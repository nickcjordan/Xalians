import * as React from "react"
import { Shell, Masthead } from "@/components/system/masthead"

/**
 * Page templates (docs/DESIGN_SYSTEM.md sections 2 and 10): the four
 * compositions chrome pages keep rebuilding by hand, each `Shell` +
 * `Masthead` + a fixed slot arrangement. Each page still sets its own
 * `data-tier="chrome"` on its outer `<main id="main">`; these templates
 * render inside that main.
 */

type MastheadSlots = Pick<React.ComponentProps<typeof Masthead>, "kicker" | "title" | "subtitle" | "beside" | "aside">

/** Encyclopedia species and worlds, the account collection. */
function IndexPage({
  className,
  masthead,
  filters,
  children,
  pagination,
  ...props
}: React.ComponentProps<"div"> & {
  masthead: MastheadSlots
  filters?: React.ReactNode
  pagination?: React.ReactNode
}) {
  return (
    <Shell className={className} {...props}>
      <Masthead {...masthead} />
      {filters ? <div className="mb-6">{filters}</div> : null}
      {children}
      {pagination ? <div className="mt-8">{pagination}</div> : null}
    </Shell>
  )
}

/** Species record, world record, a generator result. */
function RecordPage({
  className,
  masthead,
  breadcrumb,
  plate,
  body,
  readouts,
  ...props
}: React.ComponentProps<"div"> & {
  masthead: MastheadSlots
  breadcrumb?: React.ReactNode
  plate: React.ReactNode
  body: React.ReactNode
  readouts?: React.ReactNode
}) {
  return (
    <Shell className={className} {...props}>
      {breadcrumb ? <div className="mt-6">{breadcrumb}</div> : null}
      <Masthead {...masthead} />
      <div className="grid gap-8 md:grid-cols-[320px_1fr] lg:grid-cols-[400px_1fr]">
        <div>{plate}</div>
        <div className="min-w-0">{body}</div>
      </div>
      {readouts ? <div className="mt-8">{readouts}</div> : null}
    </Shell>
  )
}

/** Account settings, any setup screen. A single column capped at 62ch. */
function FormPage({
  className,
  masthead,
  primary,
  secondary,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  masthead: MastheadSlots
  primary?: React.ReactNode
  secondary?: React.ReactNode
}) {
  return (
    <Shell className={className} {...props}>
      <Masthead {...masthead} />
      <div className="max-w-[62ch] pb-24 sm:pb-0">{children}</div>
      {(primary || secondary) ? (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-end gap-3 border-t border-edge-strong bg-s2 p-4 sm:static sm:mt-8 sm:max-w-[62ch] sm:border-0 sm:bg-transparent sm:p-0">
          {secondary}
          {primary}
        </div>
      ) : null}
    </Shell>
  )
}

/** Duel and Reclamation results, training scores. */
function ResultsPage({
  className,
  masthead,
  outcome,
  stats,
  body,
  keys,
  ...props
}: React.ComponentProps<"div"> & {
  masthead: Omit<MastheadSlots, "beside">
  outcome?: React.ReactNode
  stats?: React.ReactNode
  body?: React.ReactNode
  keys?: React.ReactNode
}) {
  return (
    <Shell className={className} {...props}>
      <Masthead {...masthead} beside={outcome} />
      {stats ? <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">{stats}</div> : null}
      {body}
      {keys ? <div className="mt-8 flex flex-wrap gap-3">{keys}</div> : null}
    </Shell>
  )
}

export { IndexPage, RecordPage, FormPage, ResultsPage }
