export type TextDensity = "normal" | "compact" | "tight";

export function getCardTextDensity(item: string, excuse: string): TextDensity {
  const itemLen = item.length;
  const excuseLen = excuse.length;
  const totalLen = itemLen + excuseLen;

  if (totalLen > 200 || excuseLen > 160) return "tight";
  if (totalLen > 120 || excuseLen > 100 || itemLen > 30) return "compact";
  return "normal";
}
