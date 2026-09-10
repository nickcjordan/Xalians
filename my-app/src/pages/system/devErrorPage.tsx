import * as React from "react"

/**
 * Tier: chrome (it renders `ErrorPage` via the boundary it trips). A
 * developer route, unlinked like `/styleguide`: throws on render so
 * `ErrorBoundary` (src/components/system/status.tsx) can be seen and
 * screenshotted.
 */
export default function DevErrorPage(): React.ReactElement {
  throw new Error("Thrown by /dev/error on purpose, to exercise ErrorBoundary.")
}
