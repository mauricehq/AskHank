"use node";

interface PastConversation {
  item?: string;
  estimatedPrice?: number;
  verdict?: "approved" | "denied";
  excuse?: string;
  createdAt: number;
}

const MAX_CONVERSATIONS = 30;

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatShortDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function sanitizeForYaml(value: string): string {
  return value.replace(/"/g, "'");
}

function formatEntry(c: PastConversation): string {
  const lines: string[] = [];
  lines.push(`  - item: "${sanitizeForYaml(c.item!)}"`);
  if (c.estimatedPrice && c.estimatedPrice > 0) {
    lines.push(`    price: "$${c.estimatedPrice.toLocaleString()}"`);
  }
  lines.push(`    date: "${formatShortDate(c.createdAt)}"`);
  if (c.excuse) {
    lines.push(`    claim: "${sanitizeForYaml(c.excuse)}"`);
  }
  return lines.join("\n");
}

export function formatMemoryYaml(
  conversations: PastConversation[]
): string | null {
  // Sort most recent first, cap at 30
  const sorted = [...conversations]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_CONVERSATIONS);

  // Filter out entries with no useful item
  const useful = sorted.filter(
    (c) => c.item && c.item !== "unknown"
  );

  const approved = useful.filter((c) => c.verdict === "approved");
  const history = useful.filter((c) => c.verdict !== "approved");

  if (approved.length === 0 && history.length === 0) {
    return null;
  }

  const sections: string[] = [];
  if (approved.length > 0) {
    sections.push("approved:\n" + approved.map(formatEntry).join("\n"));
  }
  if (history.length > 0) {
    sections.push("history:\n" + history.map(formatEntry).join("\n"));
  }

  return sections.join("\n");
}
