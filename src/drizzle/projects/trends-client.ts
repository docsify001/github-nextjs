/**
 * Client-safe helpers for trends. Do not import db or anything from database here.
 * Use this from Client Components instead of @/drizzle/projects when you only need
 * getProjectTrends, getProjectMonthlyTrends, or OneYearSnapshots type.
 */
import type { OneYearSnapshots } from "./get";
import { computeTrends } from "../snapshots/compute-trends";
import { getMonthlyTrends } from "../snapshots/monthly-trends";

export type { OneYearSnapshots };

export function flattenSnapshots(records: OneYearSnapshots[]) {
  return records.flatMap(({ year, months }) =>
    months.flatMap(({ month, snapshots }) =>
      snapshots.flatMap(({ day, stars }) => ({ year, month, day, stars }))
    )
  );
}

export function getProjectTrends(snapshots: OneYearSnapshots[], date?: Date) {
  const flattenedSnapshots = flattenSnapshots(snapshots);
  return computeTrends(flattenedSnapshots, date);
}

export function getProjectMonthlyTrends(
  snapshots: OneYearSnapshots[],
  date?: Date
) {
  const flattenedSnapshots = flattenSnapshots(snapshots);
  return getMonthlyTrends(flattenedSnapshots, date || new Date());
}
