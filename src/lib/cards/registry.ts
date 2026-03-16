import type { CardType, VerdictCardData } from "./types";

interface CardRegistryEntry {
  generateTitle: (data: any) => string;
  generateDescription: (data: any) => string;
}

const cardRegistry: Record<string, CardRegistryEntry> = {
  verdict: {
    generateTitle: (data: VerdictCardData) => {
      const verdict = data.verdict === "denied" ? "NO" : "YES";
      return `Hank says ${verdict} to ${data.item}`;
    },
    generateDescription: (data: VerdictCardData) => {
      if (data.verdictSummary) return data.verdictSummary;
      return data.verdict === "denied"
        ? `Hank shut down this purchase.`
        : `Hank approved this purchase.`;
    },
  },
};

export function getCardEntry(cardType: CardType): CardRegistryEntry | undefined {
  return cardRegistry[cardType];
}

export function isValidCardType(type: string): type is CardType {
  return type in cardRegistry;
}
