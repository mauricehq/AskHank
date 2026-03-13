/**
 * Timezone-aware relative date formatting for memory nudges.
 *
 * When a timezone is provided, uses calendar-day boundaries in the user's
 * local time so "today" and "yesterday" match what the user actually experienced.
 * Falls back to elapsed-time math (UTC) when no timezone is available.
 */

/** Convert a UTC timestamp to a YYYY-MM-DD string in the given timezone. */
export function toCalendarDate(timestamp: number, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    // en-CA produces YYYY-MM-DD natively
    return formatter.format(new Date(timestamp));
  } catch {
    // Invalid timezone — fall back to UTC
    const d = new Date(timestamp);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
}

/** Count whole calendar days between two timestamps in a given timezone. */
export function calendarDaysBetween(
  earlier: number,
  later: number,
  timezone: string
): number {
  const d1 = toCalendarDate(earlier, timezone);
  const d2 = toCalendarDate(later, timezone);
  const ms1 = Date.parse(d1);
  const ms2 = Date.parse(d2);
  return Math.round((ms2 - ms1) / (1000 * 60 * 60 * 24));
}

function daysToBucket(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days <= 6) return "a few days ago";
  if (days <= 13) return "last week";
  if (days <= 29) return "a couple weeks ago";
  if (days <= 59) return "last month";
  if (days <= 89) return "a couple months ago";
  return "a few months ago";
}

/**
 * Format a timestamp as a human-relative label.
 *
 * If `timezone` is provided, calendar-day math in the user's local time is used
 * so that "today" / "yesterday" boundaries match the user's wall clock.
 *
 * Without timezone, falls back to elapsed-time division (original behavior).
 */
export function formatRelativeDate(
  timestamp: number,
  now: number = Date.now(),
  timezone?: string
): string {
  if (timezone) {
    const days = calendarDaysBetween(timestamp, now, timezone);
    return daysToBucket(days);
  }
  // Fallback: elapsed-time math (no timezone)
  const days = Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
  return daysToBucket(days);
}

/**
 * Window-appropriate buckets for category history labels.
 * Different from daysToBucket: no "today"/"yesterday" (nonsensical as a window),
 * collapses small ranges upward, no "ago" suffix (duration, not point in time).
 */
export function daysToWindowLabel(days: number): string {
  if (days <= 6) return "a few days";
  if (days <= 29) return "a couple weeks";
  if (days <= 89) return "a couple months";
  return "a few months";
}

/**
 * Compute a window label between an oldest timestamp and now.
 * Uses timezone-aware calendar-day math when available, else elapsed-time.
 */
export function formatWindowLabel(
  oldestTimestamp: number,
  now: number,
  timezone?: string
): string {
  if (timezone) {
    const days = calendarDaysBetween(oldestTimestamp, now, timezone);
    return daysToWindowLabel(days);
  }
  const days = Math.floor((now - oldestTimestamp) / (1000 * 60 * 60 * 24));
  return daysToWindowLabel(days);
}
