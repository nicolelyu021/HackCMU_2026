# Decisions and parked scope

One line per decision. Add yours at the bottom with the hour (`H+9`).

## Compressing the 12-week PRD to 24 hours (2026-09-11)

| PRD / meeting notes say | 24 h decision | Why |
|---|---|---|
| Expo / React Native, iOS + Android, EAS, TestFlight | **Web only** (Next.js 16), desktop layout, Chrome | no Xcode on the build machine, no time; the demo is a laptop |
| Supabase (Auth, Postgres + PostGIS, Storage, Realtime, RLS, Edge Functions) | **Hono + `node:sqlite` + local files**, in-process jobs + polling, no auth | zero ops; behind `Repo`/`StorageProvider` so Supabase is a later adapter |
| Mapbox (`flyTo` for the vlog) | **MapLibre GL + OpenFreeMap** (keyless), camera driven per frame with `jumpTo` | no token; frame-driven is what Remotion needs anyway |
| Google Places, "no pin without a place_id", opening hours | **Nominatim/OSM**, "no pin without a verified OSM hit inside the destination bbox", no hours | keyless; the hallucination guard survives, hours do not |
| ElevenLabs bake-off, zh + en, 2–3 voices, licensed music library | **OpenAI TTS**, one voice, English, music optional (CC0 track if any) | one afternoon of vendor work removed |
| Remotion Lambda, MP4 to camera roll, public share page with stripped GPS | **Player in the browser**; local `remotion render` = stretch; share page = stretch | render infra has no story in 3 minutes |
| Ask with web search / places / weather tools | Ask grounded **only** in pin + trip + notes + captions; no tools | "it only knows what you wrote" is the stronger story and cannot hallucinate the weather |
| MAP-8 vision Ask, MAP-9 offline tiles, MAP-10 co-travelers | Out | |
| X-1 auth, X-2 privacy/deletion, X-3 bilingual UI, X-4 analytics | Out | not demoable |
| 12-week milestones, weekly cadence | 5 checkpoints in 24 h ([TEAM.md](TEAM.md)) | |
| Success metrics: 5 real trips, 80 % auto-pin, cost dashboard | "three clean rehearsals, one offline" | |
| Data model: PostGIS `geography`, Supabase webhooks | `lat REAL, lng REAL`; upload **is** ingest (no webhook) | |
| Meeting notes: chatbot-first "like a diary book", landing page → nav → chat → journal → map order | Map-first; the chat is a drawer on the map ("Talk to your journal"); no landing page | conflicts with "everything is a pin" — the PRD wins, the chat survives as the journal drawer + "summarize my day" |
| Meeting notes: AI-generated visuals (GenJutsu / Higgsfield), notifications, VR/location UI | Out; the vlog uses the user's real photos | real photos are the point — narration grounded in your own trip |
| Meeting notes: trip cards "Miami 2026, New York 2025" | One seeded trip (Pittsburgh) + whatever is created live | more fixtures = more seed time, no more score |
| PRD gives D both the highest-risk module and the PM hat | Keep; A drives the demo, B is integration captain H+18→H+22 | D must be free to fix the Player at H+20 |

## Policies we must respect
- **Nominatim usage policy**: max 1 request/second, identifying `User-Agent` with a contact (`NOMINATIM_EMAIL`), cache results, no bulk geocoding. The policy explicitly covers LLM-generated code (this repo). Adapter: `packages/ai/src/places/nominatim.ts`.
- **OSM / OpenFreeMap attribution**: keep the attribution control visible on the map and the line "© OpenStreetMap contributors · OpenFreeMap" in the vlog outro.
- **Photo privacy** (PRD X-2): originals stay under `data/files`; the share page (if built) strips `lat/lng/exif` from media rows.

## Open decisions (owner, due)
1. Demo trip photos: team photo walk in Oakland during I1 (JPEG mode, AirDrop) vs Wikimedia/Unsplash with credits — **B**, H+2.
2. MapLibre inside the Player: go/no-go — **D**, H+4 (fallback = `map_mode: 'static'`).
3. Music: one CC0 track or none — **D**, H+8.
4. Voice: `nova` vs `shimmer` — **D**, H+8.
5. Kyoto vs another city for the live plan — **C**, H+6 (needs 5 clean planner runs).

## Log
- H+0 · scaffold generated; contracts frozen; `main` tagged `scaffold`.
