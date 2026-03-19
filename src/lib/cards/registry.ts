import type { CardType, DecisionCardData } from "./types";

interface CardRegistryEntry {
  generateTitle: (data: any) => string;
  generateDescription: (data: any) => string;
}

const cardRegistry: Record<string, CardRegistryEntry> = {
  decision: {
    generateTitle: (data: DecisionCardData) => {
      const label = data.decision === "buying" ? "buying" : data.decision === "skipping" ? "skipping" : "thinking about";
      return `${label} ${data.item} — AskHank`;
    },
    generateDescription: (data: DecisionCardData) => {
      if (data.reactionText) return data.reactionText;
      return data.decision === "skipping"
        ? `Decided to skip this purchase.`
        : data.decision === "buying"
          ? `Decided to buy it.`
          : `Still thinking about it.`;
    },
  },
};

export function getCardEntry(cardType: CardType): CardRegistryEntry | undefined {
  return cardRegistry[cardType];
}

export function isValidCardType(type: string): type is CardType {
  return type in cardRegistry;
}
