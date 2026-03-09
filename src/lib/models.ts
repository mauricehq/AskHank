export interface ModelConfig {
  id: string;
  displayName: string;
  provider: string;
  inputPer1K: number;
  outputPer1K: number;
}

export const HANK_MODELS: ModelConfig[] = [
  {
    id: "anthropic/claude-haiku-4-5",
    displayName: "Claude Haiku 4.5",
    provider: "Anthropic",
    inputPer1K: 0.0008,
    outputPer1K: 0.004,
  },
  {
    id: "anthropic/claude-sonnet-4-5",
    displayName: "Claude Sonnet 4.5",
    provider: "Anthropic",
    inputPer1K: 0.003,
    outputPer1K: 0.015,
  },
  {
    id: "openai/gpt-4o-mini",
    displayName: "GPT-4o Mini",
    provider: "OpenAI",
    inputPer1K: 0.00015,
    outputPer1K: 0.0006,
  },
  {
    id: "x-ai/grok-4.1-fast",
    displayName: "Grok 4.1 Fast",
    provider: "xAI",
    inputPer1K: 0.0002,
    outputPer1K: 0.0005,
  },
  {
    id: "deepseek/deepseek-chat-v3-0324",
    displayName: "DeepSeek V3.2",
    provider: "DeepSeek",
    inputPer1K: 0.00025,
    outputPer1K: 0.00038,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    displayName: "Llama 3.3 70B (Free)",
    provider: "Meta",
    inputPer1K: 0,
    outputPer1K: 0,
  },
];

const modelMap = new Map(HANK_MODELS.map((m) => [m.id, m]));

export function getModelConfig(id: string): ModelConfig | undefined {
  return modelMap.get(id);
}

export function isValidModelId(id: string): boolean {
  return modelMap.has(id);
}

export function getFallbackModelId(): string {
  return "meta-llama/llama-3.3-70b-instruct:free";
}
