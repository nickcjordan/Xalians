// `centerInRail` now lives in `@/components/system/station-row` (the house
// `StationRow` piece); this module re-exports it so callers that predate
// `StationRow` (Bestiary's element row) keep working without a rename.
export { centerInRail } from '@/components/system/station-row';
