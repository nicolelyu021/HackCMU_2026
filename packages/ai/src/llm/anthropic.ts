import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type {
  LLMJSONRequest,
  LLMMessage,
  LLMProvider,
  LLMRequest,
  LLMStreamEvent,
  LLMTask,
} from '@pinlog/schema';

export interface AnthropicLLMOptions {
  api_key: string;
  /** Default claude-opus-5 (env ANTHROPIC_MODEL). */
  model?: string;
  /** Per-task request timeouts (ms). */
  timeouts_ms?: Partial<Record<LLMTask, number>>;
}

/** docs/DEMO.md fallback matrix: plan 25 s (the draft call), ask 10 s, script 12 s… tuned up a little for Opus 5. */
export const DEFAULT_TIMEOUTS_MS: Record<LLMTask, number> = {
  plan: 40_000,
  replan: 30_000,
  ask: 15_000,
  chat: 15_000,
  summary: 15_000,
  caption: 15_000,
  script: 45_000,
};

const DEFAULT_MAX_TOKENS: Record<LLMTask, number> = {
  plan: 8192,
  replan: 4096,
  ask: 800,
  chat: 800,
  summary: 600,
  caption: 160,
  script: 6000,
};

function toSdkMessages(messages: LLMMessage[]): Anthropic.MessageParam[] {
  return messages.map((m) => ({
    role: m.role,
    content:
      typeof m.content === 'string'
        ? m.content
        : m.content.map((b): Anthropic.ContentBlockParam =>
            b.type === 'text'
              ? { type: 'text', text: b.text }
              : {
                  type: 'image',
                  source: { type: 'base64', media_type: b.media_type, data: b.data_base64 },
                },
          ),
  }));
}

function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

function assertNotRefused(msg: Anthropic.Message) {
  if (msg.stop_reason === 'refusal') {
    throw new Error(
      `Claude declined this request${msg.stop_details?.explanation ? `: ${msg.stop_details.explanation}` : ''}`,
    );
  }
}

/**
 * Live adapter. Adaptive thinking is the model default; `effort` maps to output_config.effort so latency-sensitive
 * tasks (ask/chat/plan) run at low effort. JSON tasks use structured outputs (`output_config.format`) and are validated
 * against the zod schema by the SDK; one retry with the validation error appended.
 */
export function createAnthropicLLM(opts: AnthropicLLMOptions): LLMProvider {
  const client = new Anthropic({ apiKey: opts.api_key, maxRetries: 1 });
  const model = opts.model ?? 'claude-opus-5';
  const timeouts = { ...DEFAULT_TIMEOUTS_MS, ...opts.timeouts_ms };

  const params = (req: LLMRequest): Anthropic.MessageCreateParamsNonStreaming => ({
    model,
    max_tokens: req.max_tokens ?? DEFAULT_MAX_TOKENS[req.task],
    system: req.system,
    messages: toSdkMessages(req.messages),
    ...(req.effort ? { output_config: { effort: req.effort } } : {}),
  });
  const reqOpts = (task: LLMTask, signal?: AbortSignal) => ({
    timeout: timeouts[task],
    ...(signal ? { signal } : {}),
  });

  return {
    name: 'anthropic',
    async complete(req) {
      const res = await client.messages.create(params(req), reqOpts(req.task));
      assertNotRefused(res);
      return { text: textOf(res) };
    },
    async completeJSON<T>(req: LLMJSONRequest<T>) {
      const format = zodOutputFormat(req.schema);
      const attempt = async (messages: LLMMessage[]) => {
        const res = await client.messages.parse(
          {
            ...params({ ...req, messages }),
            output_config: {
              ...(req.effort ? { effort: req.effort } : {}),
              format,
            },
          },
          reqOpts(req.task),
        );
        assertNotRefused(res);
        if (res.parsed_output === null || res.parsed_output === undefined) {
          throw new Error(`structured output missing for ${req.schema_name}`);
        }
        return res.parsed_output as T;
      };
      try {
        return await attempt(req.messages);
      } catch (err) {
        // The SDK throws AnthropicError when the JSON does not satisfy the zod schema; retry once with the issues.
        if (!(err instanceof Anthropic.AnthropicError) || err instanceof Anthropic.APIError)
          throw err;
        return attempt([
          ...req.messages,
          {
            role: 'user',
            content: `Your previous ${req.schema_name} did not validate:\n${err.message}\nReturn a corrected ${req.schema_name} that satisfies the schema exactly.`,
          },
        ]);
      }
    },
    async *stream(req, signal): AsyncIterable<LLMStreamEvent> {
      const stream = client.messages.stream(params(req), reqOpts(req.task, signal));
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield { type: 'delta', text: event.delta.text };
        }
      }
      const final = await stream.finalMessage();
      assertNotRefused(final);
      yield { type: 'done', text: textOf(final) };
    },
  };
}
