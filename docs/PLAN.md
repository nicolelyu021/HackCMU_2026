# 24-hour plan — iteration board, readiness board, cut list

**This is the only status artifact.** Owners update their own nodes the moment a status changes (one-line commit:
`docs: A2 done H+9`). D reconciles at every checkpoint. If it is not on this board, it is not in the demo.

Legend: `todo` grey · `wip` yellow · `done` green · `blocked` red · `cut` dashed. Node id = owner letter + number.

## Iteration board

```mermaid
flowchart LR
  classDef todo    fill:#f1f3f5,stroke:#868e96,color:#212529
  classDef wip     fill:#fff3bf,stroke:#e67700,color:#212529
  classDef done    fill:#d3f9d8,stroke:#2b8a3e,color:#212529
  classDef blocked fill:#ffe3e3,stroke:#c92a2a,color:#212529
  classDef cut     fill:#f8f9fa,stroke:#adb5bd,color:#868e96,stroke-dasharray:4 2

  subgraph I0["I0 · Skeleton (H+0 → H+1) — generated, all packages real, 69 tests, smoke green"]
    S1["S1 contracts + fixtures + mocks + 18 EXIF demo photos"]:::done
    S2["S2 sqlite repo · storage · ingest/assign · seed CLI"]:::done
    S3["S3 planner · replan · ask · journal · summary · script (mock + Claude + replay/fallback)"]:::done
    S4["S4 Remotion composition · Player · TTS · vlog job"]:::done
    S5["S5 web: notebook redesign 09-12 (shelf · map room · scrapbook · journal · film) — DESIGN_HANDOFF.md"]:::done
    S6["S6 docs · CI · smoke.mjs"]:::done
  end

  subgraph I1["I1 · Vertical slice on fakes (H+1 → H+6)"]
    A1["A1 phone shell verified in a real Chrome at 390×844 · map renders (worker fix) · done 09-12 01:50"]:::done
    B1["B1 seed the real demo trip (own photos, EXIF stamped, notes)"]:::todo
    C1["C1 live planner with keys: Kyoto 2 days ≥ 6 verified pins < 25 s; record replay"]:::todo
    D1["D1 MapLibre-in-Player spike: go/no-go by H+4 (fallback = static route card)"]:::todo
  end

  subgraph I2["I2 · Real data flows (H+6 → H+12)"]
    A2["A2 photo drop + landing HUD + tray move-to-pin"]:::todo
    A3["A3 Ask tab + journal chat streaming UI"]:::todo
    B2["B2 auto-assign edge cases (tz offset, HEIC, no-time) + Range on /files"]:::todo
    B3["B3 tile cache proxy for offline demo (stretch)"]:::todo
    C2["C2 Ask / chat grounding + 'From your notes' + summary tuning"]:::todo
    C3["C3 script generator: word budget, photo picks, source_entry_ids"]:::todo
    D2["D2 flyover interpolation · Ken Burns · captions · outro route draw-on"]:::todo
    D3["D3 OpenAI TTS live + music ducking"]:::todo
  end

  subgraph I3["I3 · Demo-grade (H+12 → H+18, half capacity)"]
    A4["A4 studio page: phone bezel, stepper, 'from your note' pill, regenerate"]:::todo
    B4["B4 pnpm demo:reset + automatic fallbacks (replay on error/timeout)"]:::todo
    C4["C4 notes for the demo trip (first person, one concrete detail each); 5 planner runs"]:::todo
    D4["D4 MP4 export spike, timeboxed 60 min (cut → QuickTime recording)"]:::todo
  end

  subgraph I4["I4 · Integration + rehearsals (H+18 → H+22)"]
    X1["X1 rehearsal #1 with keys → backup video recorded"]:::todo
    X2["X2 rehearsal #2 offline (hotspot off) → replay + cached vlog"]:::todo
    X3["X3 git tag demo · clean clone runs pnpm i && pnpm seed && pnpm dev"]:::todo
  end

  S1 --> A1 & B1 & C1 & D1
  B1 --> A2
  C1 --> C2 --> C3 --> D2
  D1 --> D2 --> A4
  A2 --> B2
  B4 --> X2
  A4 & C4 & D4 --> X1 --> X2 --> X3
```

### What the generated skeleton does NOT do yet (honest list, H+1)
- No music track (`music_url` is always null; VLOG-4 "music optional").
- MP4 export CLI (`pnpm render`) is written but has not been run here (needs Remotion's headless Chrome download) — D4.
- Drag a photo **onto a marker** is not built; the tray's "Move to pin" picker is (cut-list #5 already taken).
- Drag-to-reorder pins is not built; delete / add manual pin / change time are (PLAN-3 in-lite).
- Live planner + live TTS have been exercised only through the mocks; first real-key run is C1 / D3.
- ~~Basemap tiles and the live MapLibre flyover could not be verified headless~~ → they never rendered in *any* browser because MapLibre's web worker 404'd under Turbopack (docs/ARCHITECTURE.md gotcha 15). Fixed 09-12 01:40; map tiles, the pin sheet, journal, tray and the live flyover inside the Player were then verified in a real Chrome at 390×844 (A1). Not yet verified on a physical phone (see HANDOFF.md step 3).

## Demo readiness board (one node per beat of [DEMO.md](DEMO.md); A updates after each rehearsal)

```mermaid
flowchart LR
  classDef ok fill:#d3f9d8,stroke:#2b8a3e
  classDef flaky fill:#fff3bf,stroke:#e67700
  classDef broken fill:#ffe3e3,stroke:#c92a2a
  classDef todo fill:#f1f3f5,stroke:#868e96

  R1["1 open on the Pittsburgh map"]:::ok --> R2["2 Kyoto plan streams pins"]:::todo --> R3["3 pin sheet: photos, note, why"]:::ok
  R3 --> R4["4 live photo lands on the CMU pin"]:::todo --> R5["5 no-GPS photo → tray → move"]:::todo --> R6["6 Summarize my day"]:::flaky
  R6 --> R7["7 Make vlog → stepper"]:::todo --> R8["8 Player: flyover + narration + note pill"]:::flaky --> R9["9 outro + architecture slide"]:::todo
```

Rule: a beat that is red at H+22 is removed from the script, not fixed on stage.

_09-12 01:50: green = walked in a real Chrome (phone viewport, mock providers); yellow = renders but only exercised with mock answers / not yet on a physical phone or with keys._

## Cut order when behind (first cut → last cut)
1. MP4 export via `remotion render` → screen-record the Player (QuickTime).
2. Vision captions on ingest → fixture/hand-written captions only.
3. Replan (PLAN-4).
4. Drag-to-reorder pins → delete + add manual only.
5. Drag photo onto a marker → "Move to pin" picker only.
6. "Create pin from photo" in the tray.
7. Pin-level Ask → keep only the trip-level journal chat (same judging value).
8. Music ducking → constant low music, or no music.
9. Share page.
10. Live planner → replay only (looks identical on stage).
11. Live TTS → cached TTS for the seeded trip, silent + captions elsewhere.
12. Outro route draw-on → static route.

**Never cut:** map with pins · photo drop + auto-assign + tray · vlog in the Player with flyover + narration · streaming plan (live or replay) · "Summarize my day".

## PRD requirement matrix for 24 h

| ID | Status | 24 h acceptance |
|---|---|---|
| PLAN-1 create trip | **In** | destination, dates, party, interests, pace, budget in ≤ 5 taps |
| PLAN-2 AI itinerary | **In (modified)** | pins stream in; every pin verified against OSM inside the destination bbox; unresolved dropped with a visible count; ≥ 3/day; no opening hours |
| PLAN-3 edit itinerary | In-lite | delete, add manual pin, change time; reorder = stretch |
| PLAN-4 NL replan | Stretch | diff applied; user pins locked |
| PLAN-5 route lines + travel time | In (route) / fake (time) | route line per day; "~min walk" label if time |
| PLAN-6 import pasted itinerary | Out | |
| MAP-1 map-first home | **In** | day chips, route, "now" marker |
| MAP-2 pin sheet | **In** | Info / Photos / Notes / Ask |
| MAP-3 Ask | In-lite | streamed, grounded in pin + trip + notes, **no tools**, history saved |
| MAP-4 photo upload + auto-assign | **In** | EXIF in browser; 300 m / ±2 h; landing HUD |
| MAP-5 unsorted tray | **In** | tray + move-to-pin; create-pin-from-photo = stretch |
| MAP-6 quick note | **In** | text + mood |
| MAP-7 timeline | Out (list view = stretch) | |
| MAP-8/9/10 | Out | |
| VLOG-1 one-tap generate | **In (modified)** | in-page stepper instead of push |
| VLOG-2 AI script | **In** | ≤ 4 photos/pin, ≤ 2 sentences, grounded, `source_entry_ids` |
| VLOG-3 visuals | **In** | 1080×1920 @ 30 fps in the Player; MP4 file = stretch |
| VLOG-4 TTS + music | In-lite | one voice, English; music optional |
| VLOG-5 regenerate | Stretch | instructions passed to the script generator |
| VLOG-6 edit script | Out | |
| VLOG-7 export / share page | Stretch / Out | |
| VLOG-8 templates | Out | |
| X-1 auth · X-2 privacy · X-3 i18n · X-4 analytics | Out | parked in [DECISIONS.md](DECISIONS.md) |
| Journal chat + "summarize my day" (meeting notes) | **In** | trip-level chat grounded in notes |
