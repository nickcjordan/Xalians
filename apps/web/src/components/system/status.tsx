import * as React from "react"
import { Link } from "react-router"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Shell } from "@/components/system/masthead"
import XalianNavbar from "@/components/navbar"

/**
 * The pages a site needs before it has content (docs/DESIGN_SYSTEM.md
 * section 6, empty/error states; section 10, `data-tier`). All three keep
 * the navbar and `data-tier="chrome"`; a person is never dropped into a
 * blank room, even when something has gone wrong.
 */

function StatusFrame({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="min-h-screen bg-room text-ink font-body" data-tier="chrome">
      <XalianNavbar />
      <Shell>
        <div className="flex min-h-[50vh] flex-col justify-center py-16">{children}</div>
      </Shell>
    </main>
  )
}

function StatusBody({
  kicker,
  title,
  children,
  actions,
}: {
  kicker: React.ReactNode
  title: React.ReactNode
  children?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex max-w-[62ch] flex-col gap-4">
      <p className="type-legend m-0">{kicker}</p>
      <h1 className="type-title m-0">{title}</h1>
      {children}
      {actions ? <div className="mt-2 flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  )
}

/** Registered as the router fallback and at `/404`. */
function NotFoundPage({ path }: { path?: string }) {
  const shownPath = path ?? (typeof window !== "undefined" ? window.location.pathname : "")
  return (
    <StatusFrame>
      <StatusBody
        kicker="Not found"
        title={<span className="type-data break-all normal-case tracking-normal">{shownPath}</span>}
        actions={
          <>
            <Button asChild>
              <Link to="/">Go home</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/encyclopedia">Open the encyclopedia</Link>
            </Button>
          </>
        }
      >
        <p className="font-body text-body text-ink-2">There is no record at this address.</p>
      </StatusBody>
    </StatusFrame>
  )
}

/** Rendered by `ErrorBoundary`, or directly for a caught request error. */
function ErrorPage({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : error != null ? String(error) : "An unexpected error stopped this page."
  const retry = onRetry ?? (() => window.location.reload())
  return (
    <StatusFrame>
      <StatusBody
        kicker="Something went wrong"
        title="The page did not load"
        actions={
          <>
            <Button onClick={retry}>Try again</Button>
            <Button asChild variant="secondary">
              <Link to="/">Go home</Link>
            </Button>
          </>
        }
      >
        <pre className="type-data w-full break-words whitespace-pre-wrap border border-edge bg-s0 p-4 text-small text-ink-2">{message}</pre>
      </StatusBody>
    </StatusFrame>
  )
}

/** Checks `navigator.onLine` and retries automatically when it flips back. */
function OfflinePage({ onRetry }: { onRetry?: () => void }) {
  const [online, setOnline] = React.useState(typeof navigator === "undefined" ? true : navigator.onLine)
  React.useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      onRetry?.()
    }
    const goOffline = () => setOnline(false)
    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [onRetry])

  if (online) return null

  return (
    <StatusFrame>
      <StatusBody kicker="Offline" title="No connection">
        <p className="font-body text-body text-ink-2">
          Waiting for a connection to come back. This page retries automatically.
        </p>
      </StatusBody>
    </StatusFrame>
  )
}

type ErrorBoundaryState = { error: Error | null }

/** Wraps the router `<Routes>` so a render error shows `ErrorPage` instead of a blank tab. */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught", error, info)
  }

  render() {
    if (this.state.error) {
      return <ErrorPage error={this.state.error} onRetry={() => this.setState({ error: null })} />
    }
    return this.props.children
  }
}

export { NotFoundPage, ErrorPage, OfflinePage, ErrorBoundary, StatusFrame }
