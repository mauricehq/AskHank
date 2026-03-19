export interface DecisionCardData {
  decision: "buying" | "skipping" | "thinking";
  item: string;
  estimatedPrice?: number;
  category?: string;
  reactionText?: string;
  hankScore?: number;
}

export interface RoastCardData {
  bestQuote: string;
  item: string;
  decision: "buying" | "skipping" | "thinking";
}

export interface SavedTotalCardData {
  savedTotal: number;
  skippedCount: number;
  buyingCount: number;
}

export type CardType = "decision" | "roast" | "savedTotal";

export type CardData =
  | { cardType: "decision"; data: DecisionCardData }
  | { cardType: "roast"; data: RoastCardData }
  | { cardType: "savedTotal"; data: SavedTotalCardData };
