import { YearMonthDay } from "./types";

export function normalizeDate(date: Date): YearMonthDay {
  const dt = new Date(date);
  const year = dt.getFullYear();
  const month = dt.getMonth() + 1;
  const day = dt.getDate();
  return { year, month, day };
}

export function toDate({ year, month, day }: YearMonthDay): Date {
  return new Date(year, month - 1, day);
}
