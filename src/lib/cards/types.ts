export interface VerdictCardData {
  verdict: "approved" | "denied";
  item: string;
  estimatedPrice?: number;
  category?: string;
  verdictSummary?: string;
  score?: number;
  thresholdMultiplier?: number;
}

export interface RoastCardData {
  bestQuote: string;
  item: string;
  verdict: "approved" | "denied";
}

export interface SavedTotalCardData {
  savedTotal: number;
  deniedCount: number;
  approvedCount: number;
}

export type CardType = "verdict" | "roast" | "savedTotal";

export type CardData =
  | { cardType: "verdict"; data: VerdictCardData }
  | { cardType: "roast"; data: RoastCardData }
  | { cardType: "savedTotal"; data: SavedTotalCardData };
