import { z } from 'zod';
import { Id } from './common';
import { Entry } from './entry';
import { Itinerary, ReplanDiff } from './itinerary';
import { Media } from './media';
import { Message } from './message';
import { Pin } from './pin';
import { VlogScript } from './script';
import { Trip } from './trip';
import { Vlog, VlogSettings } from './vlog';

// ---- HTTP contract (see docs/CONTRACTS.md for the route table) ----

export const ErrorCode = z.enum([
  'validation',
  'not_found',
  'conflict',
  'locked_pin',
  'provider_error',
  'internal',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;
export const ErrorResponse = z.object({
  error: z.object({ code: ErrorCode, message: z.string(), details: z.unknown().optional() }),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;

export const Health = z.object({
  ok: z.literal(true),
  mode: z.enum(['mock', 'live']),
  providers: z.object({ llm: z.string(), places: z.string(), tts: z.string() }),
  version: z.string(),
  files_base_url: z.string(),
  map_style_url: z.string(),
});
export type Health = z.infer<typeof Health>;

/** GET /trips/:id — everything the map page needs in one fetch. */
export const TripBundle = z.object({
  trip: Trip,
  pins: z.array(Pin),
  media: z.array(Media),
  entries: z.array(Entry),
});
export type TripBundle = z.infer<typeof TripBundle>;

export const TripsResponse = z.object({ trips: z.array(Trip) });
export type TripsResponse = z.infer<typeof TripsResponse>;
export const PinsResponse = z.object({ pins: z.array(Pin) });
export type PinsResponse = z.infer<typeof PinsResponse>;

/** POST /trips/:id/plan (SSE PlanEvent). Preferences come from the Trip row; this adds the free-text extras. */
export const PlanRequest = z.object({
  must_see: z.array(z.string()).optional(),
  notes: z.string().optional(),
});
export type PlanRequest = z.infer<typeof PlanRequest>;
export const PlanResult = z.object({
  itinerary: Itinerary,
  pins: z.array(Pin),
  dropped: z.array(z.string()),
});
export type PlanResult = z.infer<typeof PlanResult>;

export const ReplanRequest = z.object({ instruction: z.string().min(1) });
export type ReplanRequest = z.infer<typeof ReplanRequest>;
export const ReplanResponse = z.object({ diff: ReplanDiff, pins: z.array(Pin) });
export type ReplanResponse = z.infer<typeof ReplanResponse>;

export const AskRequest = z.object({ question: z.string().min(1) });
export type AskRequest = z.infer<typeof AskRequest>;
export const ChatRequest = z.object({ message: z.string().min(1) });
export type ChatRequest = z.infer<typeof ChatRequest>;
export const MessagesResponse = z.object({ messages: z.array(Message) });
export type MessagesResponse = z.infer<typeof MessagesResponse>;

/** POST /trips/:id/summary — "summarize my day" (also persisted as a chat exchange). */
export const SummaryRequest = z.object({ day_index: z.number().int().min(1).optional() });
export type SummaryRequest = z.infer<typeof SummaryRequest>;
export const SummaryResponse = z.object({
  summary: z.string(),
  day_index: z.number().int().nullable(),
  message_id: Id,
});
export type SummaryResponse = z.infer<typeof SummaryResponse>;

export const UploadMediaResponse = z.object({
  media: z.array(Media),
  /** Per uploaded file, in order: where it landed and why (for the landing HUD). */
  results: z.array(
    z.object({
      media_id: Id,
      pin_id: Id.nullable(),
      reason: z.string(),
      distance_m: z.number().nullable(),
    }),
  ),
});
export type UploadMediaResponse = z.infer<typeof UploadMediaResponse>;

export const CreateVlogInput = VlogSettings;
export type CreateVlogInput = z.infer<typeof CreateVlogInput>;
export const RegenerateVlogInput = z.object({ instructions: z.string().min(1) });
export type RegenerateVlogInput = z.infer<typeof RegenerateVlogInput>;
export const UpdateScriptInput = z.object({ script: VlogScript });
export type UpdateScriptInput = z.infer<typeof UpdateScriptInput>;
export const VlogsResponse = z.object({ vlogs: z.array(Vlog) });
export type VlogsResponse = z.infer<typeof VlogsResponse>;
