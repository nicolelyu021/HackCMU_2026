# Contracts (frozen after the scaffold — changes are `[contract]` PRs, additive only)

Source of truth: `packages/schema/src`. This page is the human index.

## Conventions
- **snake_case** everywhere on the wire (matches the PRD).
- **Ids** are opaque strings: `crypto.randomUUID()` at runtime, readable ids in fixtures (`trip_pgh`, `pin_pgh_d1_phipps`, `media_pgh_03`, `vlog_pgh_demo`). Fixture ids are frozen (the demo script depends on them).
- **Time**: `planned_start/end`, `taken_at` are naive trip-local wall clocks `YYYY-MM-DDTHH:mm:ss` (EXIF has no timezone; compare wall clocks). `created_at/updated_at` are UTC ISO. Dates `YYYY-MM-DD`. Helpers in `time.ts`.
- **Geo**: `lat`/`lng` numbers; `haversineM` in `geo.ts`.
- **Storage keys** (`storage-keys.ts`), never URLs in the db: `trips/<trip>/media/<id>.<ext>`, `trips/<trip>/thumbs/<id>.jpg`, `vlogs/<vlog>/seg_<NN>.wav`, `vlogs/<vlog>/video.mp4`. URL = `fileUrl(files_base_url, key)`; `files_base_url` comes from `GET /health`.
- **Errors**: `{ error: { code, message, details? } }` with `code ∈ validation | not_found | conflict | locked_pin | provider_error | internal` → 400 / 404 / 409 / 400 / 502 / 500. Zod issues go in `details`.

## Entities (zod)
`Trip`, `Pin` (`kind poi|food|lodging|transport|custom`, `source ai|user|photo`, `place_id` required for AI pins), `Media` (`assign_method auto|manual|none`; `pin_id null` = unsorted tray), `Entry` (journal note, `mood`), `Message` (`pin_id null` = trip-level journal chat), `Vlog` (`status queued|scripting|tts|rendering|done|failed`, `settings`, `script`), `ItineraryDraft` → `Itinerary` (resolved, every stop has a `place_id`), `ReplanDraft` → `ReplanDiff`, `VlogScript` (PRD 10.6 + `source_entry_ids`), `VlogRenderProps` (script + resolved media URLs + pins + map options).

## HTTP routes (`services/api`)

| Method | Path | Owner | Body → Response | Status |
|---|---|---|---|---|
| GET | `/health` | B | → `Health` | 200 |
| GET | `/files/*` | B | → bytes (Range supported) | 200/206/404 |
| GET | `/trips` | B | → `{ trips }` | 200 |
| POST | `/trips` | B | `CreateTripInput` → `Trip` | 201 |
| GET | `/trips/:id` | B | → `TripBundle` (trip, pins, media, entries) | 200/404 |
| PATCH | `/trips/:id` | B | `UpdateTripInput` → `Trip` | 200 |
| DELETE | `/trips/:id` | B | → (deletes files too) | 204 |
| POST | `/trips/:id/pins` | B | `CreatePinInput` → `Pin` | 201 |
| PATCH | `/pins/:id` | B | `UpdatePinInput` → `Pin` | 200 |
| DELETE | `/pins/:id` | B | → | 204 |
| PUT | `/trips/:id/pins/order` | B | `ReorderPinsInput` → `{ pins }` | 200 |
| POST | `/pins/:id/entries` | B | `CreateEntryInput` → `Entry` | 201 |
| POST | `/trips/:id/entries` | B | `CreateEntryInput` → `Entry` (trip-level) | 201 |
| DELETE | `/entries/:id` | B | → | 204 |
| POST | `/trips/:id/media` | B | multipart `files[]` + `meta` (JSON `UploadMediaMeta[]`) → `UploadMediaResponse` | 201 |
| PATCH | `/media/:id` | B | `UpdateMediaInput` (`pin_id` string → manual, null → tray) → `Media` | 200 |
| DELETE | `/media/:id` | B | → | 204 |
| POST | `/trips/:id/share` | B | → `Trip` with `share_slug` (stretch) | 200 |
| GET | `/share/:slug` | B | → `TripBundle` + `{ vlog }`, media stripped of GPS (stretch) | 200 |
| POST | `/trips/:id/plan` | C | `PlanRequest` → **SSE `PlanEvent`** | 200 |
| POST | `/trips/:id/replan` | C | `ReplanRequest` → `ReplanResponse` | 200 / 400 `locked_pin` |
| POST | `/pins/:id/ask` | C | `AskRequest` → **SSE `AskEvent`** | 200 |
| GET | `/pins/:id/messages` | C | → `{ messages }` | 200 |
| POST | `/trips/:id/chat` | C | `ChatRequest` → **SSE `AskEvent`** | 200 |
| GET | `/trips/:id/messages` | C | → `{ messages }` (trip-level) | 200 |
| POST | `/trips/:id/summary` | C | `SummaryRequest` → `SummaryResponse` | 200 |
| POST | `/trips/:id/vlog` | D | `CreateVlogInput` (= `VlogSettings`) → `Vlog` (status queued; one job per trip at a time) | 202 / 409 |
| GET | `/vlogs/:id` | D | → `Vlog` (poll every 1.5 s) | 200/404 |
| GET | `/trips/:id/vlogs` | D | → `{ vlogs }` | 200 |
| POST | `/vlogs/:id/regenerate` | D | `RegenerateVlogInput` → `Vlog` | 202 |
| PUT | `/vlogs/:id/script` | D | `UpdateScriptInput` → `Vlog` (re-runs TTS) | 202 |
| POST | `/vlogs/:id/render` | D | → `Vlog` (MP4 stretch) | 202 |

## Server-sent events
Wire: `event: <type>\ndata: <JSON of the whole event>\n\n`, `content-type: text/event-stream`. Produce with `sse()` in
`services/api/src/lib/sse.ts`; consume with `parseSSE(response.body)` / `parseSSEText()` from `@pinlog/schema`.

- `PlanEvent`: `status {stage: drafting|resolving|ordering|saving}` → `stop {day_index, stop}` (provisional, verified) / `warning {name, reason}` (dropped) → `done {itinerary, pins, dropped}` | `error {message}`.
- `AskEvent`: `delta {text}` … → `done {message_id, content}` | `error {message}` (`tool_call`/`tool_result` reserved).

## Package APIs (the functions routes call)
- `@pinlog/platform`: `createRepo({ path })`, `createStorage({ kind: 'local', root } | { kind: 'memory' })`, `ingestPhoto(ports, { trip_id, bytes, meta })`, `seedFixtures(ports, { reset?, start_date?, photos? })`.
- `@pinlog/ai`: `createLLM(kind, opts)`, `createPlaces(kind, opts)`, `plan(ports, trip, req, signal) → AsyncIterable<PlanEvent>`, `replan(...)`, `ask(ports, pin_id, req, opts) → AsyncIterable<AskEvent>`, `chat(...)`, `summarize(...)`, `caption(...)`, `generateScript(ports, trip_id, settings, { previous })`.
- `@pinlog/tts`: `createTTS(kind, opts)`, `silentWav`, `wavDuration`.
- `@pinlog/video`: `VlogPlayer({ props: VlogRenderProps, ... })` (client component); render CLI `pnpm render -- --vlog <id>`.
- `@pinlog/schema` helpers: `buildRenderProps`, `scriptDurationInFrames`, `segmentStartFrames`, `itineraryToNewPins`, `createMemoryRepo`, `createMemoryStorage`, `encodeSSE`/`parseSSE`, time + geo helpers.

## Ports (interfaces in `packages/schema/src/ports`)
`LLMProvider { complete, completeJSON(schema), stream }` (with `task` and `inputs` so mocks/replays work) ·
`PlacesProvider { geocode, search }` · `TTSProvider { synthesize } → WAV + measured duration` ·
`StorageProvider { put, get, delete, exists, deletePrefix }` · `Repo { trips, pins, media, entries, messages, vlogs }`
(async; `createMany`/`reorder`/`applyDiff` atomic; throws `NotFoundError` / `LockedPinError`;
`importRows(RepoRows)` inserts fully-formed rows verbatim — ids and timestamps kept — for seeds/imports; `demoRows()` in
fixtures produces the demo trip in that shape).

## Query knobs (not part of the JSON contract)
- `POST /trips/:id/vlog`, `/vlogs/:id/regenerate`, `PUT /vlogs/:id/script` accept `?wait=1` to return the finished job
  (tests, smoke); the UI polls `GET /vlogs/:id` instead.
- `POST /pins/:id/ask`, `/trips/:id/chat`, `/trips/:id/summary` accept `?now=YYYY-MM-DDTHH:mm:ss` to override the
  trip-local clock (rehearsing "today" on another day).

## Changing a contract
1. Open a PR titled `[contract] …` touching `packages/schema` only (plus fixtures/tests).
2. Additive only during the hackathon: new optional fields, new events, new routes. Never rename or remove.
3. Ping all four owners in the team chat; a reviewer from the consuming side approves.
4. Merge first, everyone rebases immediately. `pnpm test` (fixture validation) must stay green.
