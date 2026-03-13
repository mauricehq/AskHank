import { describe, it, expect } from "vitest";
import { computeWorkHours, formatWorkHoursBlock } from "./workHours";

describe("computeWorkHours", () => {
  it("returns null when price is missing", () => {
    expect(computeWorkHours(undefined, 65000, "annual")).toBeNull();
  });

  it("returns null when price is zero", () => {
    expect(computeWorkHours(0, 65000, "annual")).toBeNull();
  });

  it("returns null when price is negative", () => {
    expect(computeWorkHours(-100, 65000, "annual")).toBeNull();
  });

  it("returns null when income is missing", () => {
    expect(computeWorkHours(500, undefined, "annual")).toBeNull();
  });

  it("returns null when income is zero", () => {
    expect(computeWorkHours(500, 0, "annual")).toBeNull();
  });

  it("returns null when income is negative", () => {
    expect(computeWorkHours(500, -1000, "annual")).toBeNull();
  });

  it("returns null when incomeType is missing", () => {
    expect(computeWorkHours(500, 65000, undefined)).toBeNull();
  });

  it("computes correctly for annual income", () => {
    // $65,000/yr → $31.25/hr gross → $23.4375/hr net
    // $500 / $23.4375 = 21.3 hours
    const result = computeWorkHours(500, 65000, "annual");
    expect(result).not.toBeNull();
    expect(result!.hourlyRateNet).toBe(23.44); // rounded to 2 decimals
    expect(result!.hoursEquivalent).toBe(21.3); // rounded to 1 decimal
  });

  it("computes correctly for hourly income", () => {
    // $25/hr gross → $18.75/hr net
    // $500 / $18.75 = 26.7 hours
    const result = computeWorkHours(500, 25, "hourly");
    expect(result).not.toBeNull();
    expect(result!.hourlyRateNet).toBe(18.75);
    expect(result!.hoursEquivalent).toBe(26.7);
  });

  it("rounds hours to 1 decimal place", () => {
    // $100,000/yr → $48.0769/hr gross → $36.0577/hr net
    // $350 / $36.0577 = 9.7068... → 9.7
    const result = computeWorkHours(350, 100000, "annual");
    expect(result).not.toBeNull();
    expect(result!.hoursEquivalent).toBe(9.7);
  });

  it("rounds rate to 2 decimal places", () => {
    // $73,000/yr → $35.0961.../hr gross → $26.3221.../hr net → $26.32
    const result = computeWorkHours(100, 73000, "annual");
    expect(result).not.toBeNull();
    expect(result!.hourlyRateNet).toBe(26.32);
  });
});

describe("formatWorkHoursBlock", () => {
  it("returns null when data is null", () => {
    expect(formatWorkHoursBlock(null)).toBeNull();
  });

  it("returns YAML structure with correct values", () => {
    const block = formatWorkHoursBlock({ hourlyRateNet: 23.44, hoursEquivalent: 21.3 });
    expect(block).not.toBeNull();
    expect(block).toContain("work_hours:");
    expect(block).toContain("hourly_rate_net: 23.44");
    expect(block).toContain("hours_equivalent: 21.3");
  });

  it("formats rate to 2 decimal places", () => {
    const block = formatWorkHoursBlock({ hourlyRateNet: 18.5, hoursEquivalent: 10 });
    expect(block).toContain("hourly_rate_net: 18.50");
  });

  it("includes the anti-parroting directive", () => {
    const block = formatWorkHoursBlock({ hourlyRateNet: 20, hoursEquivalent: 5 });
    expect(block).toContain("Use this ONCE max per conversation");
    expect(block).toContain("Never say their rate out loud");
  });
});
