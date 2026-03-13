"use node";

// --- Tool-calling types ---

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface ChatCompletionOptions {
  messages: ChatMessage[];
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" };
  tools?: ToolDefinition[];
  tool_choice?: "auto" | "none" | "required" | { type: "function"; function: { name: string } };
  timeoutMs?: number;
}

interface ChatCompletionResult {
  content: string | null;
  toolCalls: ToolCall[] | null;
  model: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

interface OpenRouterResponse {
  choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[];
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export async function chatCompletion({
  messages,
  modelId,
  temperature = 0.8,
  maxTokens = 512,
  responseFormat,
  tools,
  tool_choice,
  timeoutMs = 30_000,
}: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const body: Record<string, unknown> = {
    model: modelId,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  // tools and response_format are mutually exclusive
  if (tools && tools.length > 0) {
    body.tools = tools;
    if (tool_choice) body.tool_choice = tool_choice;
  } else if (responseFormat) {
    body.response_format = responseFormat;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://askhank.com",
        "X-Title": "AskHank",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`OpenRouter request timed out after ${timeoutMs / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${text}`);
  }

  const data: OpenRouterResponse = await response.json();
  const msg = data.choices?.[0]?.message;
  const content = msg?.content ?? null;
  const toolCalls = msg?.tool_calls ?? null;

  if (!content && !toolCalls) {
    throw new Error("OpenRouter returned no content and no tool calls");
  }

  return {
    content,
    toolCalls,
    model: data.model ?? modelId,
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    },
  };
}
