# Pinlog (working title) — Travel Diary App
## PRD + Technical Design + Team Plan · v0.1

**Status:** draft for team review · **Date:** 2026-09-11 · **Team:** 4 people · **Target:** MVP demo in 12 weeks (week of Dec 1, 2026)

---

## 1. One-line pitch

A map-first travel diary: **plan** a trip as pins on a map, **live** it by asking questions and dropping photos onto those pins, then **relive** it as an auto-generated vlog you can share in one tap.

## 2. Problem

- Planning, memories and sharing live in three different apps (notes/RedNote/ChatGPT → Photos → Instagram/TikTok). Nothing ties *where* + *when* + *what happened* together.
- People shoot hundreds of trip photos and never turn them into anything. Editing a vlog takes hours; almost nobody does it.
- Generic AI chat has no idea where you are in your trip, so answers are not grounded in your own itinerary, dates, or photos.

## 3. Core concept: everything is a pin

One data model unifies all three modules.

```
Trip = ordered list of Pins
Pin  = { location, planned time, photos[], notes[], chat[] }
```

- **Plan** creates pins.
- **Map** is where you fill pins during the trip (ask, photo, note).
- **Vlog** renders the pin timeline into a video.

Everything the user does lands on a pin. This keeps the product simple and makes the vlog generator a pure function of the trip data.

## 4. Target users (MVP)

| Persona | Need | Why they'd switch |
|---|---|---|
| Student / young traveler, 20–30, 2–5 trips a year | Wants a shareable recap without editing | One-tap vlog from photos already taken |
| Trip planner of a friend group | Owns the itinerary, gets asked "what's next?" all day | Shareable map that answers questions |
| Solo traveler | Journals in Notes, forgets which photo was where | Photos auto-land on the map by GPS + time |

Not for MVP: professional creators, agencies, group real-time collaboration (P2).

## 5. Goals and non-goals

**MVP goals**
1. Plan → pins on a map in under 60 s.
2. During the trip: ask a pin a question, upload photos that auto-land on pins.
3. Generate a 45–90 s vertical vlog in under 3 minutes and share it.

**Non-goals for MVP**
- Booking (hotels, flights, tickets).
- Social feed / discovery of other people's trips.
- Real-time multi-user editing of the same trip.
- Video clips as input (photos only in MVP; short clips in P1).

## 6. User journey

```
New trip ──► AI itinerary ──► pins on map ──► (trip) ask / photo / note ──► generate vlog ──► share
   │              │                                                                │
   └── manual ────┘                                                     public page + MP4 export
```

**Screens:** Auth → Trips list → New-trip wizard → **Map (home)** → Pin sheet (Info / Photos / Notes / Ask) → Unsorted-photos tray → Timeline → Vlog studio (generate → preview → export) → Public share page (web).

## 7. Functional requirements

Priority: **P0** = MVP must-have · **P1** = MVP if time allows · **P2** = post-MVP.

### 7.1 Plan

| ID | Requirement | Pri | Acceptance criteria |
|---|---|---|---|
| PLAN-1 | Create trip: destination, dates, party size, interests, pace, budget level | P0 | Wizard completes in ≤ 5 taps |
| PLAN-2 | AI itinerary → day-by-day pins with time blocks | P0 | p90 ≤ 30 s; every AI pin resolves to a real place ID; ≥ 3 pins per day; days respect opening hours where known |
| PLAN-3 | Edit itinerary: drag to reorder, delete, add manual pin, change time | P0 | Edits persist and re-render route instantly |
| PLAN-4 | Natural-language replan ("make day 2 lighter", "swap dinner for ramen") | P1 | Only the affected pins change; user's manual pins are never removed |
| PLAN-5 | Route lines between consecutive pins with travel time (walk / transit / drive) | P1 | Travel time shown per leg |
| PLAN-6 | Import a pasted itinerary (text or RedNote post) into pins | P2 | — |

### 7.2 Map (live)

| ID | Requirement | Pri | Acceptance criteria |
|---|---|---|---|
| MAP-1 | Map-first home: trip pins, route, day filter, "now" marker | P0 | Opens on the current day of an active trip |
| MAP-2 | Pin sheet with tabs Info / Photos / Notes / Ask | P0 | Opens in ≤ 300 ms from tap |
| MAP-3 | **Ask**: Q&A grounded in this pin + trip context + current time, streamed, with web/places tools | P0 | First token ≤ 2 s; answer cites the source when it used a tool; chat history saved to the pin |
| MAP-4 | Photo upload from library; read EXIF time + GPS; auto-assign to a pin | P0 | ≥ 80% of geotagged photos land on the right pin (300 m + ±2 h window); batches of 20+ upload in background |
| MAP-5 | Unsorted tray: photos without GPS or without a matching pin; drag onto a pin or create a pin from the photo | P0 | Zero photos silently lost |
| MAP-6 | Quick note per pin (text + optional mood) | P0 | Saves offline, syncs later |
| MAP-7 | Timeline view (same data, chronological list) | P1 | — |
| MAP-8 | Ask about a photo (vision: "what is this building?") | P1 | — |
| MAP-9 | Offline: cached tiles + pins for the active trip | P2 | — |
| MAP-10 | Co-travelers can add photos/notes to a shared trip | P2 | — |

### 7.3 Vlog

| ID | Requirement | Pri | Acceptance criteria |
|---|---|---|---|
| VLOG-1 | One-tap generate from a trip (complete or in progress) | P0 | Runs in background; push/Realtime notification when done |
| VLOG-2 | AI script: narration per pin (≤ 2 sentences), captions, photo selection (≤ 4 per pin), total 45–90 s | P0 | Script is editable JSON; narration only uses facts from the user's pins/notes |
| VLOG-3 | Visuals: title card → per-pin segments (map flyover into the pin, then Ken Burns over photos + caption) → outro with full route | P0 | 1080×1920, 30 fps, MP4 (H.264) |
| VLOG-4 | TTS narration (zh / en, 2–3 voices) + background music from a licensed library | P0 | Audio ducking under narration |
| VLOG-5 | Preview + regenerate with instructions ("more chill", "skip day 1") | P1 | — |
| VLOG-6 | Edit script text before rendering | P1 | — |
| VLOG-7 | Export: save MP4 to camera roll / share sheet; public link page with map + video | P0 | Public page strips photo GPS metadata |
| VLOG-8 | Multiple templates / styles | P2 | — |

### 7.4 Cross-cutting

| ID | Requirement | Pri |
|---|---|---|
| X-1 | Auth: email, Sign in with Apple, Google | P0 |
| X-2 | Privacy: trips private by default; sharing is explicit per trip; delete trip removes media | P0 |
| X-3 | Bilingual UI (zh-CN, en) | P1 |
| X-4 | Analytics events (trip created, plan generated, photo pinned, vlog generated, shared) | P1 |

## 8. Non-functional requirements

| Metric | Target |
|---|---|
| Itinerary generation | p90 ≤ 30 s |
| Ask first token | ≤ 2 s |
| Photo upload | 20 photos in ≤ 60 s on 4G, background-safe |
| Vlog generation (60 s video) | p90 ≤ 3 min end-to-end |
| Variable cost per vlog (LLM + TTS + render) | ≤ $0.50, verify vendor pricing at decision time |
| Crash-free sessions | ≥ 99% |
| Photo privacy | Originals never public; share page serves stripped, resized copies |

## 9. Success metrics (MVP demo)

- 5 real trips completed by friends (not the team), each with ≥ 30 photos.
- ≥ 80% photos auto-pinned correctly (measured on those trips).
- ≥ 60% of completed trips generate a vlog; ≥ 50% of vlogs get shared.
- Median "trip created → first vlog" under 10 minutes of active app time.

---

## 10. Technical design

### 10.1 Architecture

```
┌──────────────────────────────────┐
│ Client: Expo (iOS / Android / Web)│
│ expo-router · Mapbox · photo      │
│ picker + EXIF extraction          │
└──────────────┬───────────────────┘
               │ HTTPS · Supabase Realtime
┌──────────────▼───────────────────┐      ┌────────────────────────────┐
│ Supabase                          │      │ AI service (Node/TS,       │
│ Auth · Postgres + PostGIS         │◄────►│ Hono on Fly.io/Railway)     │
│ Storage (photos, thumbs, mp4)     │      │ • planning agent            │
│ Edge Functions · Realtime · RLS   │      │ • pin Q&A (streaming)       │
└──────────────┬───────────────────┘      │ • photo captions            │
               │ job table (pg)            │ • vlog script               │
┌──────────────▼───────────────────┐      └──────────────┬─────────────┘
│ Render worker                     │                     │ Claude API · Places API · web search
│ TTS → Remotion → Remotion Lambda  │
│ → MP4 to Storage → Realtime notify│
└──────────────────────────────────┘
```

Why this shape: Supabase gives auth, DB, storage, and realtime for free-tier money with zero ops; a separate Node service isolates the long-running AI/render work from the client; Remotion lets the video be written in React (same skills as the app) and rendered in the cloud.

### 10.2 Stack decisions

| Layer | Choice | Alternatives considered | Status |
|---|---|---|---|
| Mobile / web client | Expo (React Native) + expo-router; web via Expo web for the share page | Flutter; PWA-only | Decided |
| Map | Mapbox (`@rnmapbox/maps` native, `mapbox-gl` web) — needed for `flyTo` camera animation in the vlog | Google Maps SDK (weaker camera control) | Decided |
| Places / geocoding | Google Places API (search + details + opening hours) | Mapbox Search Box API | Decide wk 1 |
| Backend | Supabase: Postgres + PostGIS, Auth, Storage, Edge Functions, Realtime, RLS | Firebase; custom Node + Postgres | Decided |
| AI service | Node/TypeScript (Hono) on Fly.io or Railway | Supabase Edge Functions only (too short a timeout for planning/render) | Decided |
| LLM | Claude API: tool use for Places/web lookups, JSON output for itinerary + script, streaming for Ask, vision for photo captions. Docs: https://docs.claude.com/en/api/overview | — | Decided; pick model per task by latency vs quality in wk 2 |
| TTS | ElevenLabs (multilingual) | OpenAI TTS; Azure TTS (strong zh voices); MiniMax (zh) | Decide wk 3 after a zh/en voice bake-off |
| Video render | Remotion + Remotion Lambda | FFmpeg worker on Fly.io (fallback if Mapbox-in-Remotion is unstable) | Decided, with fallback |
| Music | Licensed library (e.g., Epidemic Sound / Artlist / Uppbeat) | — | Decide wk 6 |
| Analytics | PostHog | — | P1 |
| CI/CD | GitHub Actions; EAS Build; TestFlight + internal Android track | — | Decided |

### 10.3 Data model (Postgres + PostGIS)

```sql
trips(
  id uuid pk, owner_id uuid, title text, destination text,
  start_date date, end_date date, party jsonb, interests text[],
  status text check (status in ('planning','active','completed')),
  visibility text default 'private', share_slug text unique, cover_media_id uuid
)

pins(
  id uuid pk, trip_id uuid, name text, place_id text, address text,
  location geography(point,4326), day_index int, order_index int,
  planned_start timestamptz, planned_end timestamptz,
  kind text check (kind in ('poi','food','lodging','transport','custom')),
  source text check (source in ('ai','user','photo')),
  ai_reason text                      -- why the planner picked it
)

media(
  id uuid pk, trip_id uuid, pin_id uuid null, owner_id uuid,
  storage_path text, thumb_path text, width int, height int,
  taken_at timestamptz, location geography(point,4326) null,
  exif jsonb, caption text null,      -- caption from vision model, used by vlog script
  assign_method text check (assign_method in ('auto','manual','none'))
)

entries(  -- journal notes
  id uuid pk, pin_id uuid, trip_id uuid, text text, mood text null, created_at timestamptz
)

messages(  -- pin-scoped Ask history
  id uuid pk, pin_id uuid, role text, content text, tool_calls jsonb null, created_at timestamptz
)

vlogs(
  id uuid pk, trip_id uuid,
  status text check (status in ('queued','scripting','tts','rendering','done','failed')),
  settings jsonb,          -- language, voice, template, target length
  script jsonb,            -- see 10.6
  audio_paths jsonb, video_path text, duration_s numeric, error text, created_at timestamptz
)

-- indexes: pins(trip_id, day_index, order_index); media(trip_id, taken_at); GIST on pins.location, media.location
-- RLS: every table filtered by trip membership; share page reads through a security-definer function keyed by share_slug
```

### 10.4 API surface (AI service unless noted)

| Method | Path | Purpose |
|---|---|---|
| POST | `/trips/:id/plan` | Generate itinerary → inserts pins. Body: preferences. Returns job id; client subscribes via Realtime |
| POST | `/trips/:id/replan` | Natural-language edit; returns diff (added / changed / removed pins) |
| POST | `/pins/:id/ask` | Streaming Q&A (SSE); saves to `messages` |
| POST | `/media/ingest` | Supabase storage webhook → thumbnail, caption, auto-assign to pin |
| POST | `/trips/:id/vlog` | Enqueue vlog job with settings |
| POST | `/vlogs/:id/regenerate` | Rewrite script with instructions, re-render |
| GET | `/vlogs/:id` | Status + URLs |
| GET | `/t/:slug` (web) | Public share page: map + video + captions |

Client reads/writes trips, pins, entries, media rows directly through Supabase with RLS; the AI service uses the service role.

### 10.5 Key pipelines

**Planning agent**
1. Input: destination, dates, party, interests, pace, budget, must-see list.
2. LLM drafts candidate POIs per day; each POI is verified by a Places lookup (name → place_id, coordinates, opening hours). Anything that does not resolve is dropped and the LLM is asked to replace it. **Rule: no pin without a place_id.**
3. Order within a day by geography (nearest-neighbor, then LLM sanity pass for opening hours / meal timing).
4. Output is validated against the itinerary JSON schema, then written to `pins` in one transaction.
5. Replan: send the current pins + the user's instruction; LLM returns a diff, never a full rewrite; user-created pins are locked.

**Pin Q&A (Ask)**
- Context bundle: pin (name, address, hours, planned time, `ai_reason`), the user's notes and photo captions on this pin, the previous and next pin, trip dates/party, current local time and weather (tool).
- Tools: web search, Places (nearby / details), weather. The model is told it is answering *at this location on this date*.
- Stream tokens to the client; persist the turn with tool calls for later reuse in the vlog script.

**Photo ingestion**
1. Client picks photos with `expo-media-library` (keeps EXIF; the share sheet strips it on iOS). Extract `taken_at` + GPS on device.
2. Upload original to Storage (private bucket) with metadata; storage webhook triggers `/media/ingest`.
3. Auto-assign: nearest pin within 300 m whose planned window ±2 h contains `taken_at`; fallback to nearest pin within 300 m on the same day; else `unassigned`.
4. Generate 512 px thumbnail; vision caption (one sentence, only what is visible) stored in `media.caption`.
5. Client shows the unsorted tray in Realtime; drag-to-pin sets `assign_method = 'manual'`.

**Vlog generation**
1. Build the timeline: pins in chronological order with their photos, notes, captions, and any Ask answers.
2. Script LLM call → `script.json` (10.6): pick ≤ 4 photos per pin, write narration (≤ 2 sentences, grounded in notes/captions only, no invented facts), caption, mood tag; enforce target length by word budget.
3. TTS per segment → audio files + measured durations. Segment length = narration duration + 0.6 s padding, min 3 s.
4. Remotion composition consumes `script.json` + audio: title card → for each pin: Mapbox `flyTo` (1.5 s) → photos with Ken Burns → caption overlay → outro with full route draw-on. Music track ducked under narration.
5. Render on Remotion Lambda → MP4 to Storage → update `vlogs.status` → Realtime notification.
6. Share: native share sheet with the MP4; public page at `/t/:slug` with the video and an interactive map (GPS stripped from any served photo).

### 10.6 Vlog script schema (contract between AI Lead and Video Lead)

```json
{
  "version": 1,
  "trip": { "title": "Kyoto, 3 days", "dates": "2026-10-03 – 2026-10-05", "language": "zh" },
  "voice": "warm_female_zh",
  "music_mood": "calm",
  "segments": [
    {
      "type": "title",
      "text": "京都三日",
      "duration_s": 3
    },
    {
      "type": "pin",
      "pin_id": "…",
      "day_index": 1,
      "camera": { "lng": 135.7727, "lat": 34.9949, "zoom": 15.5, "pitch": 55, "bearing": 20 },
      "photos": [ { "media_id": "…", "kenburns": "zoom_in" }, { "media_id": "…", "kenburns": "pan_left" } ],
      "narration": "早上七点的伏见稻荷，几乎没有人。",
      "caption": "Fushimi Inari · 07:12",
      "audio_path": "vlogs/…/seg_02.mp3",
      "duration_s": 6.4
    },
    { "type": "outro", "text": "34 km · 12 places · 213 photos", "duration_s": 4 }
  ]
}
```

### 10.7 Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Mapbox inside Remotion (headless Chrome) — tile loading / WebGL flakiness | Vlog pipeline blocked | Spike in week 2; use `delayRender` until `map.idle`; fallback = pre-rendered map frames via Mapbox Static Images API, or FFmpeg worker |
| Photos arrive without EXIF (iOS share sheet, WeChat-forwarded images) | Auto-pin rate drops | Library picker only; unsorted tray is always available; allow "create pin here from photo" |
| Planner hallucinates places | Trust loss | Hard rule: no pin without a resolved place_id; show `ai_reason` per pin |
| Places / Mapbox / LLM cost | Budget | Cache place lookups by place_id; cap plan retries; cost dashboard from week 1 |
| Render time > 3 min | Users abandon | Background job + notification; progressive status ("writing script → recording voice → rendering") |
| Narration says things that did not happen | Embarrassing shares | Script prompt is grounded only in notes/captions; user can edit before render (P1) |
| Scope creep (collaboration, feed) | Miss the demo | Everything in P2 stays P2 until the vlog works end-to-end |
| App Store review (photo permissions, generated content) | Launch delay | Ask for limited photo access with a clear reason string; TestFlight from week 8 |

### 10.8 Environments and repo

- Monorepo (pnpm workspaces): `apps/mobile` (Expo), `apps/web` (share page, Next.js or Expo web), `services/ai`, `services/render` (Remotion project), `packages/schema` (zod schemas shared by all four: trip, pin, itinerary, script).
- Supabase projects: `dev` and `prod`; migrations in repo.
- Secrets in EAS / Fly secrets; never in the client.

---

## 11. Milestones (12 weeks, Sep 14 – Dec 4, 2026)

| Weeks | Milestone | Exit criteria |
|---|---|---|
| 1–2 | **M0 Foundations** | Repo + CI; Expo app boots with auth; Supabase schema + RLS; `packages/schema` frozen (trip / pin / itinerary / script); Figma flows for all screens; two spikes done: EXIF-on-device, Mapbox-in-Remotion |
| 3–5 | **M1 Map + Pins** | Create trip, manual pins, route line, pin sheet, photo upload with auto-assign + unsorted tray, notes. Planning agent v1 writes pins. Internal build on 4 phones |
| 6–8 | **M2 Ask + Plan polish** | Streaming Ask with tools; replan diff; timeline view; Remotion composition renders a demo vlog from a fixed `script.json`; TestFlight to 10 friends |
| 9–11 | **M3 Vlog end-to-end** | Script → TTS → render → share page + MP4 export; regenerate; 5 real trips run by friends |
| 12 | **Polish + demo** | Bug bash, metrics readout, demo video, App Store / Play submission prepared |

Weekly cadence: Mon 30-min planning, Thu 30-min demo/blockers, everything else async in the repo.

---

## 12. Team: 4 people, 4 modules, 4 hats

Each person owns one module end-to-end **and** one cross-cutting hat. Ownership means: spec, build, test, and be the reviewer for that area.

| Role | Owns (module) | Cross-cutting hat | Main stack |
|---|---|---|---|
| **A · Client Lead** | Expo app: navigation, Map home, pin sheet, photo picker + EXIF, unsorted tray, timeline, Vlog studio UI | **Design & UX** (Figma, design system, copy) | React Native, Mapbox, expo-media-library |
| **B · Platform Lead** | Supabase schema, RLS, Storage + thumbnails, ingest webhook, auto-assign logic, share page, auth | **DevOps & cost** (CI/CD, EAS, environments, cost dashboard) | Postgres/PostGIS, Edge Functions, Next.js |
| **C · AI Lead** | Planning agent, replan diff, Pin Ask (context assembly, tools, streaming), photo captions, vlog script generation, prompt eval set | **Quality & evals** (regression set of 20 trips, hallucination checks) | Node/TS, Claude API, Places API |
| **D · Video Lead** | Remotion compositions (title, flyover, Ken Burns, captions, outro), TTS integration, music, Remotion Lambda, render job runner, MP4 export | **PM & demo** (scope, weekly agenda, demo build, metrics) | Remotion, Mapbox GL JS, TTS APIs |

### 12.1 Interfaces between people (freeze by end of week 2)

| Contract | Producer → Consumer | Format |
|---|---|---|
| Trip / Pin / Media schema | B → A, C, D | `packages/schema` (zod + SQL migrations) |
| Itinerary JSON | C → B (writes pins), A (renders) | `ItinerarySchema` |
| Ask streaming API | C → A | SSE, `{delta, tool_call, done}` events |
| Media metadata | A → B → C, D | `media` row + EXIF jsonb |
| Vlog `script.json` | C → D | `ScriptSchema` (10.6) |
| Vlog job status | D → A | `vlogs.status` via Realtime |

Once contracts are frozen, all four can build in parallel against fixtures: A uses fake trips, C tests against fixture pins, D renders from a hand-written `script.json`.

### 12.2 Who does what, by milestone

| | A · Client | B · Platform | C · AI | D · Video |
|---|---|---|---|---|
| M0 | Expo skeleton, auth screens, Figma flows, EXIF spike | Schema, RLS, buckets, CI, dev/prod projects | Planner prompt + itinerary schema, Places integration, eval set v0 | Remotion project, Mapbox-in-Remotion spike, TTS bake-off |
| M1 | Map home, pin sheet, photo upload, unsorted tray, notes | Ingest webhook, thumbnails, auto-assign, cost dashboard | Planner v1 writing real pins; caption pipeline | Composition v1 from fixture script; music shortlist |
| M2 | Ask UI with streaming, timeline, replan UI | Share page, Realtime, TestFlight pipeline | Ask with tools, replan diff, evals | Full composition; Lambda rendering; job runner |
| M3 | Vlog studio: generate / preview / export / share | Job table, status, retries, stripped public media | Script generation + regenerate | End-to-end pipeline, performance, export |
| Wk 12 | Bug bash, store assets | Monitoring, backups | Prompt regressions | Demo video, metrics |

### 12.3 Suggested assignment rule

Assign by strongest existing skill, not by interest alone: React Native experience → A; SQL / infra → B; LLM agents and prompting → C; front-end animation or video tooling → D. If two people qualify for C, the second one takes D — the vlog pipeline is the highest-risk path and benefits most from a second strong engineer.

---

## 13. Open decisions (owner, due)

1. Places provider: Google Places vs Mapbox Search — **C**, week 1.
2. TTS vendor for zh + en — **D**, week 3.
3. Narration language default (trip language vs user language) — **A**, week 4.
4. Music library and licensing — **D**, week 6.
5. Web share page: Next.js vs Expo web — **B**, week 2.
6. First store target: iOS only for MVP, or both — **D**, week 2.

## 14. Out of scope (parked)

Bookings; social feed; co-editing; video clips as input; multiple vlog templates; offline maps; itinerary import from RedNote.
