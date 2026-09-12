import { z } from 'zod';
import { Id, Timestamp } from './common';

export const Mood = z.enum(['great', 'good', 'meh', 'tired', 'bad']);
export type Mood = z.infer<typeof Mood>;

/** Journal note. pin_id null = trip-level note (day_index says which day, if any). */
export const Entry = z.object({
  id: Id,
  trip_id: Id,
  pin_id: Id.nullable(),
  day_index: z.number().int().min(1).nullable(),
  text: z.string().min(1),
  mood: Mood.nullable(),
  created_at: Timestamp,
});
export type Entry = z.infer<typeof Entry>;

export const NewEntry = Entry.omit({ id: true, created_at: true });
export type NewEntry = z.infer<typeof NewEntry>;

export const CreateEntryInput = z.object({
  text: z.string().min(1),
  mood: Mood.nullable().optional(),
  day_index: z.number().int().min(1).nullable().optional(),
});
export type CreateEntryInput = z.infer<typeof CreateEntryInput>;
