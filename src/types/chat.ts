export type MessageRole = "user" | "hank";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
}
