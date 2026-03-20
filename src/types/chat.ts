import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

export type MessageRole = "user" | "hank";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
}

export type DecisionType = "buying" | "skipping" | "thinking";
export type Intensity = "CURIOUS" | "PROBING" | "POINTED" | "WRAPPING";
export type ConversationStatus = "active" | "thinking" | "error" | "resolved" | "paused";

export type TraceSummary = NonNullable<
  FunctionReturnType<typeof api.llmTraces.getTraceSummariesForConversation>
>[number];

export interface Resolution {
  decision: DecisionType;
  reactionText: string;
  hankScore: number;
  hankScoreLabel: string;
}
