import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

export type MessageRole = "user" | "hank";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
}

export type VerdictType = "denied" | "approved";

export interface Verdict {
  type: VerdictType;
  quote: string;
}

export type Stance = "IMMOVABLE" | "FIRM" | "SKEPTICAL" | "RELUCTANT" | "CONCEDE";
export type ConversationStatus = "active" | "thinking" | "error" | "closed";

export type TraceSummary = NonNullable<
  FunctionReturnType<typeof api.llmTraces.getTraceSummariesForConversation>
>[number];
