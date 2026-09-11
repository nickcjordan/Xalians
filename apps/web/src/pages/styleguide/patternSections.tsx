import * as React from "react"
import { Link } from "react-router"

import { SectionHead } from "@/components/system/masthead"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { IndexPage, RecordPage, FormPage, ResultsPage } from "@/components/system/layout"
import { SkipLink, VisuallyHidden, LiveRegion } from "@/components/system/a11y"
import { Stepper, Step } from "@/components/system/stepper"
import { StatTile, KeyValueList, Timeline, TimelineItem, Callout, DataBlock } from "@/components/system/readouts"
import { SearchField, FilterBar } from "@/components/system/filters"
import { DataTable, type Column } from "@/components/system/data-table"
import { IdentityRow } from "@/components/system/identity"
import { ErrorBoundary } from "@/components/system/status"

/**
 * Brief B ("patterns") sections for /styleguide (docs/DESIGN_SYSTEM.md
 * section 10; untracked/briefs/system-patterns.md). Rendered from the real
 * house patterns and page templates so this reference cannot drift.
 * Wired into styleGuidePage.tsx with the three-line change rule 8 of
 * untracked/briefs/system-common.md describes.
 */

function TemplateFrame({ caption, children }: { caption: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-edge bg-s0">
      <div className="h-[340px] overflow-hidden">
        <div className="origin-top-left scale-[0.55] [width:182%]">{children}</div>
      </div>
      <p className="type-legend border-t border-edge px-4 py-2 text-ink-2">{caption}</p>
    </div>
  )
}

type SpeciesRow = { id: string; name: string; world: string; element: string; height: string }

const SPECIES_ROWS: SpeciesRow[] = [
  { id: "hypnopet", name: "Hypnopet", world: "Telypso", element: "psychic", height: "93 in / 236 cm" },
  { id: "dromeus", name: "Dromeus", world: "Magmuth", element: "fire", height: "104 in / 264 cm" },
  { id: "hippochamp", name: "Hippochamp", world: "Poseidas", element: "water", height: "78 in / 198 cm" },
  { id: "yetimoth", name: "Yetimoth", world: "Krystos", element: "ice", height: "112 in / 284 cm" },
]

const SPECIES_COLUMNS: Column<SpeciesRow>[] = [
  { key: "name", header: "Species", sortable: true },
  { key: "world", header: "World", sortable: true },
  {
    key: "element",
    header: "Element",
    sortable: true,
    cell: (r) => (
      <Badge variant="chip" className={`el-${r.element}`}>
        {r.element}
      </Badge>
    ),
  },
  { key: "height", header: "Height", sortable: true, align: "end" },
]

function A11yLiveDemo() {
  const [message, setMessage] = React.useState("")
  return (
    <div>
      <p className="type-legend mb-2">Live region: press the button</p>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setMessage(`Announced at ${new Date().toLocaleTimeString()}`)}
      >
        Announce
      </Button>
      <VisuallyHidden>Triggers a polite live-region announcement, heard by a screen reader only.</VisuallyHidden>
      <LiveRegion>{message}</LiveRegion>
      {message ? <p className="mt-2 font-body text-small text-ink-2">Last announced: {message}</p> : null}
    </div>
  )
}

function FiltersDemo() {
  const [query, setQuery] = React.useState("hyp")
  const [element, setElement] = React.useState("psychic")
  const active = query !== "" || element !== "all"
  return (
    <div className="mt-6 border border-edge bg-s1 p-4">
      <FilterBar
        search={<SearchField value={query} onChange={setQuery} placeholder="Search species" />}
        active={active}
        activeCount={(query ? 1 : 0) + (element !== "all" ? 1 : 0)}
        onClear={() => {
          setQuery("")
          setElement("all")
        }}
      >
        <ToggleGroup type="single" value={element} onValueChange={(v: string) => v && setElement(v)}>
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="psychic">Psychic</ToggleGroupItem>
          <ToggleGroupItem value="fire">Fire</ToggleGroupItem>
        </ToggleGroup>
        <Select defaultValue="height">
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="height">Sort: height</SelectItem>
            <SelectItem value="name">Sort: name</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>
    </div>
  )
}

function DataTableDemo() {
  const [sort, setSort] = React.useState<{ key: string; direction: "asc" | "desc" } | null>({ key: "name", direction: "asc" })
  const [selected, setSelected] = React.useState<Set<React.Key>>(new Set(["dromeus"]))
  return (
    <DataTable
      columns={SPECIES_COLUMNS}
      rows={SPECIES_ROWS}
      sort={sort}
      onSortChange={setSort}
      selectable
      selected={selected}
      onSelectedChange={setSelected}
      rowLink={(r) => `/encyclopedia/species/${r.id}`}
    />
  )
}

function BoundaryDemo() {
  const [broken, setBroken] = React.useState(false)
  if (broken) throw new Error("The style guide threw on purpose.")
  return (
    <div className="mt-3 flex items-center gap-3">
      <Button variant="secondary" onClick={() => setBroken(true)}>Throw a render error</Button>
      <span className="font-body text-small text-ink-2">The boundary catches it and renders ErrorPage in place; Try again resets it.</span>
    </div>
  )
}

const SECTIONS: { id: string; label: string; node: React.ReactNode }[] = [
  {
    id: "templates",
    label: "Page templates",
    node: (
      <>
        <SectionHead title="Page templates" />
        <p className="text-body text-ink-2">
          Four compositions of Shell, Masthead and fixed slots. Shown at reduced scale inside a level-0 frame; the
          full-size markup is unchanged.
        </p>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <TemplateFrame caption="IndexPage: encyclopedia species and worlds, the account collection">
            <IndexPage
              masthead={{ kicker: "Encyclopedia", title: "Species" }}
              filters={
                <FilterBar
                  search={<SearchField value="" onChange={() => {}} placeholder="Search species" />}
                  active
                  onClear={() => {}}
                >
                  <ToggleGroup type="single" defaultValue="all">
                    <ToggleGroupItem value="all">All</ToggleGroupItem>
                    <ToggleGroupItem value="fire">Fire</ToggleGroupItem>
                  </ToggleGroup>
                </FilterBar>
              }
              pagination={<p className="type-data text-small text-ink-2">1 – 4 of 29</p>}
            >
              <div className="grid grid-cols-4 gap-3">
                {SPECIES_ROWS.map((s) => (
                  <div key={s.id} className={`el-${s.element} border border-edge bg-s1 p-3`}>
                    <div className="aspect-square bg-el/24" />
                    <p className="type-legend mt-2 mb-0">{s.name}</p>
                  </div>
                ))}
              </div>
            </IndexPage>
          </TemplateFrame>

          <TemplateFrame caption="RecordPage: species record, world record, generator result">
            <RecordPage
              masthead={{ kicker: "Species", title: "Hypnopet", beside: <Badge variant="chip" className="el-psychic">psychic</Badge> }}
              breadcrumb={<p className="type-legend m-0">Encyclopedia / Species / Hypnopet</p>}
              plate={<div className="el-psychic aspect-square border border-edge bg-el/24" />}
              body={<p className="font-body text-body text-ink-2">A therapy creature native to Telypso, tuned to the planet&apos;s dreamlike psychic field.</p>}
              readouts={<div className="border-t border-edge pt-4"><p className="type-legend m-0">Stats</p></div>}
            />
          </TemplateFrame>

          <TemplateFrame caption="FormPage: account settings, any setup screen">
            <FormPage
              masthead={{ kicker: "Account", title: "Settings" }}
              primary={<Button>Save</Button>}
              secondary={<Button variant="secondary">Cancel</Button>}
            >
              <p className="font-body text-body text-ink-2">A single column capped at 62 characters, with the primary and secondary keys pinned to the bottom on the phone.</p>
            </FormPage>
          </TemplateFrame>

          <TemplateFrame caption="ResultsPage: duel and Reclamation results, training scores">
            <ResultsPage
              masthead={{ kicker: "Duel", title: "Match report" }}
              outcome={<Badge variant="ok">Won</Badge>}
              stats={
                <>
                  <StatTile value="4" label="Pieces kept" />
                  <StatTile value="2" label="Pieces lost" />
                </>
              }
              body={<p className="font-body text-body text-ink-2">The flag reached the home row on turn 14.</p>}
              keys={<Button variant="secondary">Play again</Button>}
            />
          </TemplateFrame>
        </div>
      </>
    ),
  },
  {
    id: "status-pages",
    label: "Status pages",
    node: (
      <>
        <SectionHead title="Status pages" />
        <p className="text-body text-ink-2">The pages a site needs before it has content: not found, error, and offline. Each keeps the navbar and chrome tier.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link to="/404">Open /404</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/dev/error">Open /dev/error</Link>
          </Button>
        </div>
        <div className="mt-6 border border-edge bg-s0 p-4">
          <p className="type-legend m-0">Error boundary</p>
          <ErrorBoundary>
            <BoundaryDemo />
          </ErrorBoundary>
        </div>
        <p className="mt-3 font-body text-small text-ink-2">
          Offline is not a route: <code className="type-data">OfflinePage</code> renders itself only while
          <code className="type-data"> navigator.onLine</code> is false, and retries automatically on the browser&apos;s
          <code className="type-data"> online</code> event.
        </p>
      </>
    ),
  },
  {
    id: "a11y",
    label: "Accessibility",
    node: (
      <>
        <SectionHead title="Accessibility" />
        <p className="text-body text-ink-2">A skip link, a visually hidden label, and a polite live region for announcements.</p>
        <div className="mt-6 flex flex-col gap-6">
          <div>
            <p className="type-legend mb-2">Skip link: press Tab from here</p>
            <div tabIndex={-1} className="relative border border-edge bg-s0 p-6">
              <SkipLink href="#a11y" />
              <p className="font-body text-small text-ink-2">Tab into this box; the skip link appears top-left.</p>
            </div>
          </div>
          <A11yLiveDemo />
        </div>
      </>
    ),
  },
  {
    id: "stepper",
    label: "Stepper",
    node: (
      <>
        <SectionHead title="Stepper" />
        <p className="text-body text-ink-2">A rail of numbered steps: done, current, upcoming.</p>
        <div className="mt-6 max-w-xl">
          <Stepper value={1}>
            <Step label="Squad" />
            <Step label="Board" />
            <Step label="Confirm" />
          </Stepper>
        </div>
      </>
    ),
  },
  {
    id: "readouts",
    label: "Readouts",
    node: (
      <>
        <SectionHead title="Readouts" />
        <p className="text-body text-ink-2">Stat tiles, a key/value list, an era timeline, the four callouts, and a copyable data block.</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile value="847" label="Genome viability" delta={12} caption="vs. last batch" />
          <StatTile value="6" label="Squad size" />
        </div>

        <p className="type-legend mt-8 mb-2">Key/value list</p>
        <KeyValueList
          entries={[
            { term: "Home world", detail: "Telypso" },
            { term: "Element", detail: "Psychic" },
            { term: "Attack range", detail: "2" },
            { term: "Can fly", detail: "No" },
          ]}
        />

        <p className="type-legend mt-8 mb-2">Timeline</p>
        <Timeline>
          <TimelineItem date="Age of Unbirth" title="The Tachyon Drive Cores">
            The Vallerii colonize Xalia; the Cherenkov radiation of their own FTL sterilizes them.
          </TimelineItem>
          <TimelineItem date="The End Wars" title="APEX turns">
            The AI placed over every Generator revolts, and Xalian armies fight on both sides.
          </TimelineItem>
          <TimelineItem date="Present day" title="The tournament loop">
            King Kozrak trades Scrambler Tokens for victories in his arena.
          </TimelineItem>
        </Timeline>

        <p className="type-legend mt-8 mb-2">Callouts</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Callout variant="note" title="Note">A plain informational aside.</Callout>
          <Callout variant="caution" title="Caution">An unsaved change or an expiring token.</Callout>
          <Callout variant="plague" title="Plague">A failed generation or a destructive action.</Callout>
          <Callout variant="viable" title="Viable">A genome confirmed alive and printable.</Callout>
        </div>

        <p className="type-legend mt-8 mb-2">Data block</p>
        <DataBlock copy>{`{\n  "species": "Hypnopet",\n  "element": "psychic"\n}`}</DataBlock>
      </>
    ),
  },
  {
    id: "filters",
    label: "Filters",
    node: (
      <>
        <SectionHead title="Filters" />
        <p className="text-body text-ink-2">A search field, toggle groups and a select, wrapping into a bar; collapses into a sheet under sm.</p>
        <FiltersDemo />
      </>
    ),
  },
  {
    id: "data-table",
    label: "Data table",
    node: (
      <>
        <SectionHead title="Data table" />
        <p className="text-body text-ink-2">Sortable columns, a selected row, and the empty state, on the four species rows from the record section.</p>
        <div className="mt-6 flex flex-col gap-8">
          <DataTableDemo />
          <div>
            <p className="type-legend mb-2">Empty</p>
            <DataTable columns={SPECIES_COLUMNS} rows={[]} emptyLegend="No species" emptyMessage="Nothing matches the current filters." />
          </div>
        </div>
      </>
    ),
  },
  {
    id: "identity",
    label: "Identity",
    node: (
      <>
        <SectionHead title="Identity" />
        <p className="text-body text-ink-2">Initials, name and a secondary line, for an account list or a match roster.</p>
        <div className="mt-6 flex flex-col gap-4 sm:max-w-xs">
          <IdentityRow initials="NJ" name="Nick Jordan" detail="12 Xalians kept" />
          <IdentityRow initials="GU" name="Guest tamer" detail="Not signed in" />
        </div>
      </>
    ),
  },
]

export { SECTIONS }
