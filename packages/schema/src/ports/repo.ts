import type { TripBundle } from '../api';
import type { Entry, NewEntry } from '../entry';
import type { ReplanDiff } from '../itinerary';
import type { Media, NewMedia } from '../media';
import type { Message, NewMessage } from '../message';
import type { NewPin, Pin, ReorderPinsInput, UpdatePinInput } from '../pin';
import type { CreateTripInput, Trip, UpdateTripInput } from '../trip';
import type { Vlog, VlogSettings } from '../vlog';

// Async everywhere so a Supabase-backed repo is a drop-in. Multi-row operations are named methods
// implemented atomically by the adapter (no generic transaction() on the interface).

export interface TripsRepo {
  list(): Promise<Trip[]>;
  get(id: string): Promise<Trip | null>;
  getBySlug(slug: string): Promise<Trip | null>;
  create(input: CreateTripInput): Promise<Trip>;
  update(id: string, patch: UpdateTripInput & { share_slug?: string | null }): Promise<Trip>;
  /** Cascades to pins, media rows, entries, messages, vlogs (files are the caller's job via storage.deletePrefix). */
  delete(id: string): Promise<void>;
  bundle(id: string): Promise<TripBundle | null>;
}

export interface PinsRepo {
  listByTrip(trip_id: string): Promise<Pin[]>;
  get(id: string): Promise<Pin | null>;
  create(input: NewPin): Promise<Pin>;
  /** Atomic. */
  createMany(inputs: NewPin[]): Promise<Pin[]>;
  update(id: string, patch: UpdatePinInput): Promise<Pin>;
  /** Atomic; returns the trip's pins in the new order. */
  reorder(trip_id: string, order: ReorderPinsInput['order']): Promise<Pin[]>;
  delete(id: string): Promise<void>;
  /** Atomic; rejects with a 'locked_pin' error if a removed/changed pin has source 'user'. Returns the trip's pins. */
  applyDiff(trip_id: string, diff: ReplanDiff): Promise<Pin[]>;
}

export interface MediaRepo {
  listByTrip(trip_id: string): Promise<Media[]>;
  listByPin(pin_id: string): Promise<Media[]>;
  get(id: string): Promise<Media | null>;
  create(input: NewMedia): Promise<Media>;
  update(
    id: string,
    patch: Partial<Pick<Media, 'pin_id' | 'assign_method' | 'caption'>>,
  ): Promise<Media>;
  delete(id: string): Promise<void>;
}

export interface EntriesRepo {
  listByTrip(trip_id: string): Promise<Entry[]>;
  listByPin(pin_id: string): Promise<Entry[]>;
  create(input: NewEntry): Promise<Entry>;
  delete(id: string): Promise<void>;
}

export interface MessagesRepo {
  listByPin(pin_id: string): Promise<Message[]>;
  /** Trip-level chat only (pin_id IS NULL). */
  listByTrip(trip_id: string): Promise<Message[]>;
  create(input: NewMessage): Promise<Message>;
}

export interface VlogsRepo {
  get(id: string): Promise<Vlog | null>;
  listByTrip(trip_id: string): Promise<Vlog[]>;
  create(input: { trip_id: string; settings: VlogSettings; id?: string }): Promise<Vlog>;
  update(
    id: string,
    patch: Partial<
      Pick<Vlog, 'status' | 'script' | 'video_path' | 'duration_s' | 'error' | 'settings'>
    >,
  ): Promise<Vlog>;
}

export interface Repo {
  trips: TripsRepo;
  pins: PinsRepo;
  media: MediaRepo;
  entries: EntriesRepo;
  messages: MessagesRepo;
  vlogs: VlogsRepo;
  close(): void;
}
