# The 3-minute demo

Roles: narrator speaks, **A drives**, D keeps time (hand signal at 2:30), B watches the API log. One laptop, Chrome
fullscreen, phone hotspot. Everything below is pre-seeded unless marked **live**; every live beat has an automatic
fallback that looks identical on screen.

| Time | Beat | Live? | Say (judging criterion) |
|---|---|---|---|
| 0:00–0:15 | Open on the Pittsburgh map: 9 pins, route lines, "Day 2 · today" chip | seeded | "Planning, photos and the recap live in three apps. In Pinlog everything is a pin — plan, photos, notes and the video all hang off one map." (**originality**) |
| 0:15–0:45 | New trip → "Kyoto · 2 days · temples, food" → Generate. Pins drop onto Kyoto one by one, route draws, ticker shows each pin's reason and one "couldn't verify". Tap a pin → "Why this pin" + "verified on OpenStreetMap" | **live** (replay on error/timeout) | While it streams: "Each pin is written by Claude and verified against OpenStreetMap before it lands. Anything it can't verify never appears." (**technical difficulty**, signature moment 1) |
| 0:45–1:05 | Back to Pittsburgh. Day 1 pins have photos and notes; open Phipps → Photos, Notes ("$3 extra for the fern room") | seeded | "This is our actual weekend. Day 2 is today." (**usefulness**) |
| 1:05–1:35 | Drag the photo taken at the Fence this morning onto the map → landing HUD: "60 m from Carnegie Mellon · within window" → marker pulses, count 0 → 1. Drag a photo with no GPS → tray → "Move to pin" | **live** (fallback JPEG in `~/Desktop/demo-photos/`) | "The browser reads the EXIF before anything uploads. 300 metres and two hours, in the trip's time zone. No GPS? Nothing is lost, it waits in the tray." (**technical difficulty**, signature moment 2) |
| 1:35–2:00 | Journal chat → chip "Summarize my day" → streamed 3-sentence summary ending "From your notes: …" | **live** (replay fallback) | "It only knows what we wrote. No web search, no invention — it's our diary answering." (**originality**) |
| 2:00–2:45 | "Make vlog" → stepper writing script → recording voice → ready → Player: title, flyover Cathedral → Phipps, Ken Burns over 3 photos, caption, narration; scrub to the outro route draw-on "12 km · 9 places · 16 photos" | **live** job (cached vlog on failure) | "Every line of narration cites the note it came from — the pill under the player. The video is a pure function of the trip data; Remotion drives the map frame by frame." (**technical difficulty + demo quality**, signature moment 3) |
| 2:45–3:00 | Architecture slide (the container diagram in ARCHITECTURE.md) | — | "Next, MapLibre, Hono, SQLite, Claude, OpenAI TTS, Remotion. Every provider sits behind a port with a mock — the whole thing runs with zero keys, which is how we rehearsed offline." |

## Signature moments to invest in (cheap, high perceived difficulty)
1. The landing HUD on photo drop (distance, window, pin name) — 30 minutes of UI that makes the EXIF math visible.
2. The flyover between pins with narration that only says what the note said, plus the "from your note" pill. If you only get one, this is the one.
3. Pins streaming onto the map while the model writes — comes almost free from the SSE planner.

## Pre-warm checklist (start 45 minutes before, in this order)
1. Hotspot on, laptop on it, venue wifi forgotten. Power adapter in. Do Not Disturb. Chrome: one window, 100 % zoom, no other tabs.
2. `git checkout demo && pnpm seed:reset --start 2026-09-11 && pnpm dev` (`.env` with keys present). `--start` = the day before the demo, so the seeded "Day 2" is today and the CMU pin's 11:00–18:00 window is live.
3. Walk every map view of the Pittsburgh trip (all day chips, zoomed in and out) so tiles are cached.
4. Play the seeded vlog end to end once (images, audio cached).
5. Run the Kyoto plan once (geocoder cache warm, replay recorded), then **delete that trip** so the live one is fresh.
6. `~/Desktop/demo-photos/` has `fence.jpg` (shot this morning, real EXIF, tested) and `nogps.jpg`.
7. Audio: confirm the room can hear the laptop; the Player needs one click before audio plays (autoplay policy) — the driver knows.
8. Backup video open in a second Chrome tab and on a phone.
9. **Phone beats** (if the demo is driven from the phone): phone on the laptop's hotspot, PWA installed from the LAN URL
   the api log prints, the trip page opened once so tiles are cached, the CMU pin tapped once (sheet works), the camera
   set to JPEG + Location on. Mirror the phone to the projector (QuickTime → iPhone, or AirPlay) and rehearse the mirror
   before walking on stage; keep the laptop browser open on the same trip as the fallback.

## Fallback matrix

| Failure | Automatic behaviour | Manual switch |
|---|---|---|
| LLM error / timeout (plan 25 s, ask 10 s, script 12 s) | replay fixture if recorded (`PINLOG_LLM_REPLAY=replay`), else mock | `PINLOG_LLM=mock` |
| Nominatim 403/429 | cached results; then mock places | `PINLOG_PLACES=mock` |
| TTS error | silent WAV of estimated length; captions carry the story | `PINLOG_TTS=mock` |
| Tiles slow | Chrome cache from the pre-warm; map still renders cached views | switch the Player to "Static map" |
| Vlog job fails | show the last done vlog (`vlog_pgh_demo` is always there) | — |
| Laptop dies | backup video on the phone | — |

## Photo rules for the live beat
iPhone: Settings → Camera → Formats → **Most Compatible** (JPEG). Transfer by **AirDrop** (keeps GPS; iMessage/WhatsApp strip it).
Test the exact file in the last rehearsal. The CMU pin's window is 11:00–18:00 on day 2, 850 m from any other pin, so a
photo taken on campus during the day lands there with room to spare.
