// Pure computation — no Convex imports

export interface WorkHoursData {
  hourlyRateNet: number;
  hoursEquivalent: number;
}

/**
 * Compute how many hours of work an item costs.
 * Annual → hourly via 2080 hours/year, then 25% effective tax.
 */
export function computeWorkHours(
  estimatedPrice: number | undefined,
  incomeAmount: number | undefined,
  incomeType: "hourly" | "annual" | undefined
): WorkHoursData | null {
  if (!estimatedPrice || estimatedPrice <= 0) return null;
  if (!incomeAmount || incomeAmount <= 0) return null;
  if (!incomeType) return null;

  const grossHourly = incomeType === "annual" ? incomeAmount / 2080 : incomeAmount;
  const netHourly = grossHourly * 0.75;

  if (netHourly <= 0) return null;

  const hoursEquivalent = Math.round((estimatedPrice / netHourly) * 10) / 10;
  const hourlyRateNet = Math.round(netHourly * 100) / 100;

  return { hourlyRateNet, hoursEquivalent };
}

/**
 * Format a YAML block for the system prompt.
 * Returns null when data is null.
 */
export function formatWorkHoursBlock(data: WorkHoursData | null): string | null {
  if (!data) return null;

  return `work_hours:
  hourly_rate_net: ${data.hourlyRateNet.toFixed(2)}
  hours_equivalent: ${data.hoursEquivalent}
Use ONCE max per conversation. Don't lead with it. Never say their rate out loud. Narrate the hours in your own words.`;
}
