import { describe, it, expect } from "vitest";
import { formatRelativeDate, toCalendarDate, calendarDaysBetween, daysToWindowLabel, formatWindowLabel } from "./dates";

// EDT (Eastern Daylight Time) = UTC-4, active in March 2026 (DST starts March 8).
// To get a UTC timestamp for a given ET wall-clock time: add 4 hours.
// Example: March 13 23:30 ET = March 14 03:30 UTC
function etToUtc(
  year: number, month: number, day: number,
  hour: number, minute: number
): number {
  // Add 4 hours for EDT offset
  return Date.UTC(year, month - 1, day, hour + 4, minute);
}

describe("toCalendarDate", () => {
  it("returns correct date for US Eastern timezone", () => {
    // March 13, 2026 at 11:30 PM ET = March 14 at 3:30 AM UTC
    const ts = etToUtc(2026, 3, 13, 23, 30);
    expect(toCalendarDate(ts, "America/New_York")).toBe("2026-03-13");
    expect(toCalendarDate(ts, "UTC")).toBe("2026-03-14");
  });

  it("falls back to UTC for invalid timezone", () => {
    const ts = Date.UTC(2026, 2, 13, 12, 0);
    expect(toCalendarDate(ts, "Invalid/Timezone")).toBe("2026-03-13");
  });
});

describe("calendarDaysBetween", () => {
  it("returns 0 for same calendar day", () => {
    // Both on March 13 ET
    const morning = etToUtc(2026, 3, 13, 9, 0);
    const evening = etToUtc(2026, 3, 13, 23, 0);
    expect(calendarDaysBetween(morning, evening, "America/New_York")).toBe(0);
  });

  it("returns 1 across midnight boundary", () => {
    // March 13 23:30 ET → March 14 00:30 ET
    const beforeMidnight = etToUtc(2026, 3, 13, 23, 30);
    const afterMidnight = etToUtc(2026, 3, 14, 0, 30);
    expect(calendarDaysBetween(beforeMidnight, afterMidnight, "America/New_York")).toBe(1);
  });

  it("disagrees with UTC near midnight", () => {
    // March 13 23:30 ET = March 14 03:30 UTC
    const late = etToUtc(2026, 3, 13, 23, 30);
    // March 14 00:30 ET = March 14 04:30 UTC
    const early = etToUtc(2026, 3, 14, 0, 30);

    // In ET: March 13 vs March 14 = 1 day
    expect(calendarDaysBetween(late, early, "America/New_York")).toBe(1);
    // In UTC: both March 14 = 0 days
    expect(calendarDaysBetween(late, early, "UTC")).toBe(0);
  });
});

describe("daysToWindowLabel", () => {
  it("returns 'a few days' for 0-6 days", () => {
    expect(daysToWindowLabel(0)).toBe("a few days");
    expect(daysToWindowLabel(3)).toBe("a few days");
    expect(daysToWindowLabel(6)).toBe("a few days");
  });

  it("returns 'a couple weeks' for 7-29 days", () => {
    expect(daysToWindowLabel(7)).toBe("a couple weeks");
    expect(daysToWindowLabel(14)).toBe("a couple weeks");
    expect(daysToWindowLabel(29)).toBe("a couple weeks");
  });

  it("returns 'a couple months' for 30-89 days", () => {
    expect(daysToWindowLabel(30)).toBe("a couple months");
    expect(daysToWindowLabel(60)).toBe("a couple months");
    expect(daysToWindowLabel(89)).toBe("a couple months");
  });

  it("returns 'a few months' for 90+ days", () => {
    expect(daysToWindowLabel(90)).toBe("a few months");
    expect(daysToWindowLabel(180)).toBe("a few months");
  });
});

describe("formatWindowLabel", () => {
  const now = Date.UTC(2026, 2, 13, 12, 0);

  it("returns window label using elapsed-time fallback", () => {
    expect(formatWindowLabel(now - 3 * 86400_000, now)).toBe("a few days");
    expect(formatWindowLabel(now - 20 * 86400_000, now)).toBe("a couple weeks");
    expect(formatWindowLabel(now - 60 * 86400_000, now)).toBe("a couple months");
  });

  it("returns window label using timezone-aware path", () => {
    const threeDaysAgo = etToUtc(2026, 3, 10, 12, 0);
    const nowEt = etToUtc(2026, 3, 13, 12, 0);
    expect(formatWindowLabel(threeDaysAgo, nowEt, "America/New_York")).toBe("a few days");
  });
});

describe("formatRelativeDate", () => {
  describe("without timezone (elapsed-time fallback)", () => {
    const now = Date.UTC(2026, 2, 13, 12, 0);

    it("returns 'today' for same time", () => {
      expect(formatRelativeDate(now, now)).toBe("today");
    });

    it("returns 'today' for a few hours ago", () => {
      expect(formatRelativeDate(now - 6 * 3600_000, now)).toBe("today");
    });

    it("returns 'yesterday' for 1 day ago", () => {
      expect(formatRelativeDate(now - 86400_000, now)).toBe("yesterday");
    });

    it("returns 'a few days ago' for 3 days", () => {
      expect(formatRelativeDate(now - 3 * 86400_000, now)).toBe("a few days ago");
    });

    it("returns 'last week' for 8 days", () => {
      expect(formatRelativeDate(now - 8 * 86400_000, now)).toBe("last week");
    });

    it("returns 'a couple weeks ago' for 20 days", () => {
      expect(formatRelativeDate(now - 20 * 86400_000, now)).toBe("a couple weeks ago");
    });

    it("returns 'last month' for 35 days", () => {
      expect(formatRelativeDate(now - 35 * 86400_000, now)).toBe("last month");
    });

    it("returns 'a couple months ago' for 70 days", () => {
      expect(formatRelativeDate(now - 70 * 86400_000, now)).toBe("a couple months ago");
    });

    it("returns 'a few months ago' for 100 days", () => {
      expect(formatRelativeDate(now - 100 * 86400_000, now)).toBe("a few months ago");
    });
  });

  describe("with timezone (calendar-day boundaries)", () => {
    it("returns 'today' for same calendar day in user's timezone", () => {
      const morning = etToUtc(2026, 3, 13, 9, 0);
      const evening = etToUtc(2026, 3, 13, 22, 0);
      expect(formatRelativeDate(morning, evening, "America/New_York")).toBe("today");
    });

    it("returns 'yesterday' across midnight in user's timezone", () => {
      // March 12 23:00 ET → March 13 01:00 ET
      const yesterday = etToUtc(2026, 3, 12, 23, 0);
      const today = etToUtc(2026, 3, 13, 1, 0);
      expect(formatRelativeDate(yesterday, today, "America/New_York")).toBe("yesterday");
    });

    it("UTC would say 'today' but user's timezone says 'yesterday'", () => {
      // March 12 23:30 ET = March 13 03:30 UTC
      const lateNight = etToUtc(2026, 3, 12, 23, 30);
      // March 13 00:30 ET = March 13 04:30 UTC
      const earlyMorning = etToUtc(2026, 3, 13, 0, 30);

      // With timezone: March 12 vs March 13 in ET = yesterday
      expect(formatRelativeDate(lateNight, earlyMorning, "America/New_York")).toBe("yesterday");

      // Without timezone: elapsed < 24h = today
      expect(formatRelativeDate(lateNight, earlyMorning)).toBe("today");
    });

    it("produces further-out buckets through timezone path", () => {
      const now = etToUtc(2026, 3, 13, 12, 0);
      const threeDaysAgo = etToUtc(2026, 3, 10, 12, 0);
      const eightDaysAgo = etToUtc(2026, 3, 5, 12, 0);
      const thirtyFiveDaysAgo = etToUtc(2026, 2, 6, 12, 0);

      expect(formatRelativeDate(threeDaysAgo, now, "America/New_York")).toBe("a few days ago");
      expect(formatRelativeDate(eightDaysAgo, now, "America/New_York")).toBe("last week");
      expect(formatRelativeDate(thirtyFiveDaysAgo, now, "America/New_York")).toBe("last month");
    });

    it("falls back gracefully for invalid timezone", () => {
      const now = Date.UTC(2026, 2, 13, 12, 0);
      const ts = now - 86400_000;
      expect(formatRelativeDate(ts, now, "Invalid/Zone")).toBe("yesterday");
    });
  });
});
