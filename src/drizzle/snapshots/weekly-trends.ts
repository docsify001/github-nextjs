import { Snapshot } from "./types";

export interface YearWeek {
  year: number;
  week: number;
}

export function getWeeklyDelta(snapshots: Snapshot[], date: YearWeek) {
  const firstSnapshot = getFirstSnapshotOfTheWeek(snapshots, date);
  const lastSnapshot = getLastSnapshotOfTheWeek(snapshots, date);
  
  const delta =
    !lastSnapshot || !firstSnapshot
      ? undefined
      : lastSnapshot.stars - firstSnapshot.stars;
  const stars = lastSnapshot?.stars || undefined;

  return { delta, stars };
}

export function getFirstSnapshotOfTheWeek(
  snapshots: Snapshot[],
  date: YearWeek
): Snapshot | undefined {
  const weekStart = getWeekStartDate(date.year, date.week);
  const weekEnd = getWeekEndDate(date.year, date.week);
  
  return firstElement(
    snapshots.filter((snapshot) => {
      const snapshotDate = new Date(snapshot.year, snapshot.month - 1, snapshot.day);
      return snapshotDate >= weekStart && snapshotDate <= weekEnd;
    })
  );
}

export function getLastSnapshotOfTheWeek(
  snapshots: Snapshot[],
  date: YearWeek
): Snapshot | undefined {
  const weekStart = getWeekStartDate(date.year, date.week);
  const weekEnd = getWeekEndDate(date.year, date.week);
  
  return lastElement(
    snapshots.filter((snapshot) => {
      const snapshotDate = new Date(snapshot.year, snapshot.month - 1, snapshot.day);
      return snapshotDate >= weekStart && snapshotDate <= weekEnd;
    })
  );
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getWeekStartDate(year: number, week: number): Date {
  const januaryFirst = new Date(year, 0, 1);
  const daysToAdd = (week - 1) * 7;
  const weekStart = new Date(januaryFirst.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  
  // Adjust to Monday (1 = Monday, 0 = Sunday)
  const dayOfWeek = weekStart.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - daysToMonday);
  
  return weekStart;
}

export function getWeekEndDate(year: number, week: number): Date {
  const weekStart = getWeekStartDate(year, week);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return weekEnd;
}

export function getCurrentWeek(): YearWeek {
  const now = new Date();
  return {
    year: now.getFullYear(),
    week: getWeekNumber(now),
  };
}

export function getPreviousWeek(date: YearWeek): YearWeek {
  const { year, week } = date;
  if (week === 1) {
    // First week of the year, go to last week of previous year
    const lastWeekOfPrevYear = getLastWeekOfYear(year - 1);
    return { year: year - 1, week: lastWeekOfPrevYear };
  }
  return { year, week: week - 1 };
}

export function getNextWeek(date: YearWeek): YearWeek {
  const { year, week } = date;
  const lastWeekOfYear = getLastWeekOfYear(year);
  if (week === lastWeekOfYear) {
    // Last week of the year, go to first week of next year
    return { year: year + 1, week: 1 };
  }
  return { year, week: week + 1 };
}

export function getLastWeekOfYear(year: number): number {
  const december31 = new Date(year, 11, 31);
  return getWeekNumber(december31);
}

function firstElement<T>(array: T[]) {
  return array.length ? array[0] : undefined;
}

function lastElement<T>(array: T[]) {
  return array.length ? array[array.length - 1] : undefined;
} 