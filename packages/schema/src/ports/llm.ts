import type { z } from 'zod';

/** Lets the live adapter pick effort/model per task and lets the mock pick a fixture. */
export type LLMTask = 'plan' | 'replan' | 'ask' | 'chat' | 'summary' | 'caption' | 'script';

export type LLMContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; media_type: 'image/jpeg' | 'image/png' | 'image/webp'; data_base64: string };

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string | LLMContentBlock[];
}

export interface LLMRequest {
  task: LLMTask;
  system?: string;
  messages: LLMMessage[];
  max_tokens?: number;
  effort?: 'low' | 'medium' | 'high';
  /**
   * Structured copy of what the prompt already says (timeline, pin name, destination…).
   * Ignored by live adapters; used by the mock to answer sensibly and by the replay recorder as part of the cache key.
   */
  inputs?: unknown;
}

export interface LLMJSONRequest<T> extends LLMRequest {
  schema: z.ZodType<T>;
  schema_name: string;
}

export type LLMStreamEvent = { type: 'delta'; text: string } | { type: 'done'; text: string };

export interface LLMProvider {
  readonly name: string; // 'mock' | 'anthropic' | 'replay(anthropic)'
  complete(req: LLMRequest): Promise<{ text: string }>;
  /** Validated against `schema`; adapters retry once with the validation error appended. */
  completeJSON<T>(req: LLMJSONRequest<T>): Promise<T>;
  stream(req: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMStreamEvent>;
}
