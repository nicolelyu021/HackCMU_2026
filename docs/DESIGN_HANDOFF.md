# Frontend design handoff — 12 September 2026

## Starting the app

Follow the [README startup instructions](../README.md#start-the-hackathon-demo-no-api-keys-needed), including the separate-terminal option, exact demo URLs, emergency prototype and known startup issue.

## Current product

Pinlog is a map-first travel notebook: plan a trip, attach photos and notes to real places, review what the journal has recorded, and play a short film built from those memories. The current API runs in mock mode without paid keys. The Pittsburgh demo contains 9 pins, 18 placeholder images and 7 notes.

The Cursor chat was read as project history, not as a new instruction source. This pass carries forward the requested cream / white / lavender palette and persistent notebook desk, adding original pencil artwork and a coherent visual treatment.

## What changed

- Illustrated shelf with a travel desk vignette, a taped Pittsburgh postcard, and a new-trip page.
- Nine original object illustrations replace the dock's Unicode symbols: shelf, map, scrapbook, journal, movie camera, camera, satchel, clover and photos.
- Local handwriting/body fonts; paper texture, graphite edges and lavender controls throughout the main frontend surfaces.
- Map stays inside the notebook frame. Scrapbook, journal, pin details, photo tray and film open in the same pull-up desk.
- Route sketch uses actual stop coordinates and is labeled as a schematic, not street directions. It is now the default on page load, with no tile wait or mounted WebGL renderer. Street map remains selectable and falls back to the sketch on failure.
- Sketch pins open the same real pin sheets. The street-map renderer is unmounted while the sketch is shown.
- Visible Save / Cancel controls for scrapbook text and captions. Excluded content can be included again even when every item in a section was hidden.
- Fixed journal/Ask effects returning the result of scrolling, which caused a browser error when opening the journal in this environment.
- Film settings, player and narration panels adapt between desktop columns and a phone stack; the desktop film frame fits shorter windows.

Artwork files, original generation prompts and font attribution are recorded in `docs/ART_DIRECTION.md`. Generated files are inside `apps/web/public/art`; font binaries and licenses are inside `apps/web/public/fonts`.

## Verification

Before the interrupted session: all-package type checks, 69 tests and 19 smoke checks passed. Smoke checks used an isolated copy of the demo data. A production build using `next build --webpack` passed at that checkpoint; Turbopack failed under local process restrictions.

After resuming: inspected the live app, verified the route sketch, opening a real pin sheet from its markers, journal opening, film Play/Pause, and phone layout at 390 × 844. The last route-sketch accessibility/label adjustments and film-frame sizing were checked in the running app. Formatting and diff whitespace checks passed before the final small layout adjustment.

A fresh final build did not complete: the local Next installation produced `patchErrorInspectNodeJS is not a function`; subsequent TypeScript/build processes stalled while loading dependencies, including a retry with the compile cache disabled. This is an outstanding verification issue, not a passing final build. No dependency versions or lockfiles were changed to work around it.

## Remaining demo work

1. Replace the seeded placeholder image cards with the team's real travel photos. The generated artwork in this pass is interface decoration, not fabricated trip photography.
2. Investigate the missing street tiles on the demo machine/network. Both the embedded browser and Chrome showed pins without the basemap. The new route sketch and existing film static-route fallback keep those surfaces usable.
3. Re-run the production build and type check after resolving the local dependency-loading problem.
4. Rehearse live planning/narration only if the team wants live providers; no API keys were added or changed here. Music and MP4 export remain separate team work.
5. Check camera-roll upload on a real phone, with GPS retained. Browser-size verification is not a physical-device EXIF check.

The final demo change makes the existing route sketch the default. Diff whitespace checks passed; a fresh browser check was blocked because the web server refused connections and its restart stalled. This default-switch change has not received a successful fresh build.

Existing unrelated/untracked agent guidance files were preserved outside the design commit.
