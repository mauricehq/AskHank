"use node";

export interface DetectedMove {
  turn: number;
  move: string;
}

interface MessageForMoves {
  role: "user" | "hank";
  content: string;
}

const MOVE_PATTERNS: Array<{ move: string; patterns: RegExp[] }> = [
  {
    move: "the math",
    patterns: [
      /\$\d+/,
      /rent money|not nothing|still money/i,
      /costs? \$?\d+.* to (fix|solve|repair)/i,
    ],
  },
  {
    move: "the callback",
    patterns: [
      /you (already|still) (own|have|got)/i,
      /number (two|three|four|five|six)/i,
      /the (last|previous) one you bought/i,
    ],
  },
  {
    move: "the deflation",
    patterns: [
      /you (just )?want the (aesthetic|status|feeling|vibe|look|badge|label)/i,
      /sounds like a want/i,
    ],
  },
  {
    move: "the pattern call",
    patterns: [
      /(second|third|fourth|\d+th) time/i,
      /you keep (saying|asking|coming back)/i,
      /you said that already/i,
    ],
  },
  {
    move: "the reframe",
    patterns: [
      /you're (paying for|buying) (a )?(badge|status|brand|feeling|dopamine)/i,
      /that's not a \w+[.,] that's a/i,
    ],
  },
  {
    move: "the contradiction",
    patterns: [
      /you said (you|it|that)/i,
      /you told me/i,
      /(two|three|five) (minutes|messages|impulse purchases) ago/i,
    ],
  },
];

/**
 * Scan last 2 Hank messages and detect which rhetorical move was used.
 * First regex match wins per message. Turn number = count of user messages up to that point.
 */
export function extractRecentMoves(messages: MessageForMoves[]): DetectedMove[] {
  const moves: DetectedMove[] = [];

  // Walk messages to find last 2 hank messages with their turn numbers
  const hankEntries: Array<{ content: string; userCountBefore: number }> = [];
  let userCount = 0;
  for (const m of messages) {
    if (m.role === "user") {
      userCount++;
    } else if (m.role === "hank") {
      hankEntries.push({ content: m.content, userCountBefore: userCount });
    }
  }

  // Take last 2
  const recent = hankEntries.slice(-2);

  for (const entry of recent) {
    for (const { move, patterns } of MOVE_PATTERNS) {
      if (patterns.some((p) => p.test(entry.content))) {
        moves.push({ turn: entry.userCountBefore, move });
        break; // first match wins
      }
    }
  }

  return moves;
}

/**
 * Build a RECENT MOVES prompt section, or null if no moves detected.
 */
export function buildRecentMovesSection(
  recentMoves: DetectedMove[] | undefined
): string | null {
  if (!recentMoves || recentMoves.length === 0) return null;

  const moveList = recentMoves
    .map((m) => `Turn ${m.turn}: ${m.move}.`)
    .join(" ");

  return `RECENT MOVES (vary your approach):\n${moveList} Try a different pattern or none at all.`;
}

/**
 * Build a recent approaches prompt section, or null if no moves detected.
 * LLM-friendly version without jargon.
 */
export function buildRecentApproachesSection(
  recentMoves: DetectedMove[] | undefined
): string | null {
  if (!recentMoves || recentMoves.length === 0) return null;

  const moveList = recentMoves
    .map((m) => `Turn ${m.turn}: ${m.move}.`)
    .join(" ");

  return `WHAT YOU'VE DONE RECENTLY (don't repeat yourself):\n${moveList} Try a different approach or say nothing at all.`;
}
