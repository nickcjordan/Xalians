import * as React from "react"
import { NotFoundPage } from "@/components/system/status"
import { usePageTitle } from "@/components/system/head"

/** Tier: chrome. `/404` and the router's catch-all Route. */
export default function NotFoundRoute() {
  usePageTitle("Not found")
  return <NotFoundPage />
}
