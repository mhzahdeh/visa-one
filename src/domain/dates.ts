// dates.ts — all date maths is anchored to DEMO_TODAY (R13), never the system clock.

import { DEMO_TODAY } from "./config";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function parseISO(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Format as "Fri 13 Nov" (brief's date style). */
export function formatDate(iso: string): string {
  const d = parseISO(iso);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Whole days from DEMO_TODAY to the given ISO date (positive = future). */
export function daysFromToday(iso: string): number {
  const target = parseISO(iso).getTime();
  const base = DEMO_TODAY.getTime();
  return Math.round((target - base) / (1000 * 60 * 60 * 24));
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Inclusive-of-start, exclusive-of-today start date for a rolling window. */
export function windowStartISO(days: number): string {
  const d = new Date(DEMO_TODAY);
  d.setDate(d.getDate() - days);
  return toISO(d);
}

export const TODAY_ISO = toISO(DEMO_TODAY);

/** Weekday name of DEMO_TODAY, e.g. "Wednesday". */
export function todayWeekdayName(): string {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][DEMO_TODAY.getDay()];
}

/** ISO date from local year, month (0-based) and day, without time-zone drift. */
export function isoFromParts(year: number, month: number, day: number): string {
  const d = new Date(year, month, day);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Whole days left in the current calendar period after DEMO_TODAY (R13).
 * Weeks run Monday to Sunday: on Wed 4 Nov a weekly period has 4 days to go.
 */
export function periodDaysLeft(period: "daily" | "weekly" | "monthly" | "yearly"): number {
  const d = DEMO_TODAY;
  switch (period) {
    case "daily":
      return 0;
    case "weekly":
      return (7 - d.getDay()) % 7; // Sunday = 0 days left
    case "monthly":
      return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate();
    case "yearly": {
      const end = new Date(d.getFullYear(), 11, 31).getTime();
      return Math.round((end - d.getTime()) / 86_400_000);
    }
  }
}

/** First day of the current calendar period (weeks start on Monday), from DEMO_TODAY. */
export function periodStartISO(period: "daily" | "weekly" | "monthly" | "yearly"): string {
  const d = DEMO_TODAY;
  switch (period) {
    case "daily":
      return isoFromParts(d.getFullYear(), d.getMonth(), d.getDate());
    case "weekly":
      return isoFromParts(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
    case "monthly":
      return isoFromParts(d.getFullYear(), d.getMonth(), 1);
    case "yearly":
      return isoFromParts(d.getFullYear(), 0, 1);
  }
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Calendar cells for a month, Monday first. `null` = padding before day 1. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday = 0
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day++) cells.push(isoFromParts(year, month, day));
  return cells;
}
