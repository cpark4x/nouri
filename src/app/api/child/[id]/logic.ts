/**
 * Date utility functions for the child detail API (B7 — Past Meals History).
 * Re-exports from the dashboard logic to avoid duplication — the algorithms
 * are identical (parseDateParam + buildDateWindow are route-agnostic helpers).
 * Uses a relative import so Vitest can resolve it without path-alias config.
 */
export { parseDateParam, buildDateWindow } from "../../dashboard/logic";
