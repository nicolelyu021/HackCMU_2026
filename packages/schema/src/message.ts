import { z } from 'zod';
import { Id, Timestamp } from './common';

export const MessageRole = z.enum(['user', 'assistant']);
export type MessageRole = z.infer<typeof MessageRole>;

export const ToolCall = z.object({
  name: z.string(),
  input: z.unknown(),
  result_summary: z.string().optional(),
});
export type ToolCall = z.infer<typeof ToolCall>;

/** Ask history. pin_id set = pin-scoped Ask; pin_id null = trip-level "talk to your journal" chat. */
export const Message = z.object({
  id: Id,
  trip_id: Id,
  pin_id: Id.nullable(),
  role: MessageRole,
  content: z.string(),
  tool_calls: z.array(ToolCall).nullable(),
  created_at: Timestamp,
});
export type Message = z.infer<typeof Message>;

export const NewMessage = Message.omit({ id: true, created_at: true });
export type NewMessage = z.infer<typeof NewMessage>;
