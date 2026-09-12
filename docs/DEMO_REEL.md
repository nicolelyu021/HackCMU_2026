# Demo reel: how the voiced Pinlog trailer was made

Output: [`Videos/pinlog_demo_concat_vo.mp4`](../Videos/pinlog_demo_concat_vo.mp4) — 30 s, 1280x720, 24 fps, English voice-over, burned-in captions, location labels and an end card.

Tooling lives in [`tools/video-vo/`](../tools/video-vo/): `make_vo.py` (pipeline) and `script.json` (every word and timestamp). Everything below is reproducible with one command once the key is in place.

## 1. Source footage

Two 15-second clips exported from the Pinlog map room (WeChat re-encoded them on the way to the laptop):

| Clip | What it shows |
| --- | --- |
| `Weixin Videos2026-09-12_124018_029.mp4` | Pittsburgh day: Cathedral of Learning → Phipps Conservatory → Andy Warhol Museum → hand-drawn journal page |
| `Weixin Videos2026-09-12_124730_927.mp4` | CMU Spring Carnival (Ferris wheel, booths, doodling on a red wall) → Kennywood coaster under storm clouds → closed journal |

Both are h264 1280x720 @ 24 fps with 32 kHz stereo AAC and a continuous music bed at about −23 dB.

## 2. Concatenation

Stream-copy concat (`-f concat -c copy`) produced a 220-second file from 30 seconds of video: the two clips have different time bases (1/12288 vs 1/90000), so the second clip's timestamps were misread. The fix is the `concat` filter with a re-encode:

```sh
ffmpeg -i clip1.mp4 -i clip2.mp4 -filter_complex \
  "[0:v]setpts=PTS-STARTPTS,fps=24[v0];[1:v]setpts=PTS-STARTPTS,fps=24[v1];\
   [0:a]asetpts=PTS-STARTPTS[a0];[1:a]asetpts=PTS-STARTPTS[a1];\
   [v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 -c:a aac -b:a 160k -movflags +faststart \
  Videos/pinlog_demo_concat.mp4
```

## 3. Understanding the footage before writing a word

Frames were extracted every 1.5 s (`fps=1/1.5`) and tiled into contact sheets so the scene boundaries could be read off directly. That gave the cue table that drives everything else:

| Time | Scene |
| --- | --- |
| 0.0–2.5 | Cathedral of Learning photo dissolving into a watercolor page |
| 3–7 | Phipps glasshouse, inside then outside |
| 7.5–10.5 | Warhol gallery, painted over into a journal page with a camera and lavender |
| 12–14 | Journal page, then the notebook closing |
| 15–22 | CMU campus from above, Carnival Ferris wheel, booths, student drawing on a red wall |
| 23–27 | Kennywood wooden coaster, watercolor edges |
| 27–30 | Finished journal on a wooden table |

The voice-over lines, caption timings and label windows in `script.json` all come from this table.

## 4. Writing the voice-over

First draft was a clean "narrator" script. It read as a product ad, so it was rewritten as a first-person vlog: contractions, short sentences, one aside per scene ("and yeah, I doodled on the wall"). Six lines, roughly 55 words for 30 seconds.

Design rules that held up:

- One line per scene, starting on the cut, never bridging two scenes.
- Leave the last three seconds for the name: "Pinlog. My little wander diary."
- Every cue carries a `scene` note so a line can be rewritten without re-watching.

## 5. Text-to-speech with ElevenLabs

Endpoint: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128`, header `xi-api-key`, JSON body `{text, model_id, voice_settings}`. Each line is synthesised as its own clip so it can be placed at an exact timestamp.

What changed between iterations:

- **Voice.** Sarah (mature, reassuring) sounded like a documentary. Switched to Jessica (`cgSgspJ2msm6clMCkdW9`, "playful, bright, warm"), picked from `GET /v1/voices` by its `labels`.
- **Model.** `eleven_multilingual_v2` is even-paced and slightly flat. `eleven_v3` is far more expressive and understands audio tags in square brackets, so the script uses `[excited]` and `[laughs]`. Stability is set to 0.35 (lower = more expressive). Tags are stripped automatically for captions and for non-v3 models.
- **Length.** v3 pauses for effect, so the same words ran 25–30 % longer: the first v3 pass totalled 38 s of speech for a 30 s video. Two fixes, in this order: cut words first, then let the pipeline trim leading/trailing silence and, only if a line still overruns its slot, apply `atempo` capped at 1.12x so nothing sounds rushed. The script prints each line's start, length and end and flags any overrun.
- **Caching.** Clips are cached under `tools/video-vo/build/` keyed by text + voice + model, so re-timing a cue or editing one line does not re-spend credits on the other five.

## 6. Mixing

The original music bed is kept at 22 % volume; each voice clip is delayed to its cue time with `adelay`, everything is summed with `amix=normalize=0` and passed through `alimiter`. Final mean loudness is about −20 dB with peaks at −3 dB.

## 7. Captions, labels and end card

The Homebrew `ffmpeg` on this machine is a minimal build with no `libass`, `subtitles` or `drawtext` filter, so text is rendered with Pillow instead: each caption, label and card becomes a full-frame RGBA PNG, and ffmpeg composites them with `overlay` gated by `enable='between(t,start,end)'` plus alpha `fade` in and out.

- **Captions** (bottom centre): the spoken line without tags, Avenir Next Demi Bold on a translucent rounded pill; shown from the cue start to the end of the synthesised clip, so the subtitle length always matches the actual audio. A cue can override its caption text.
- **Labels** (top left): hand-written Marker Felt with a purple pin dot, one per location, timed to the scene table above.
- **End card**: "pinlog / your little wander diary", centred, over the closed journal at 28.2–30.1 s.

Fonts come from `/System/Library/Fonts/Supplemental`; swap the paths in `FONTS` in `make_vo.py` for other machines.

## 8. Reproducing it

```sh
brew install ffmpeg
python3 -m pip install --user pillow certifi
echo 'ELEVENLABS_API_KEY=sk_...' >> .env          # .env is gitignored
python3 tools/video-vo/make_vo.py --video Videos/pinlog_demo_concat.mp4
```

Useful flags: `--preview` renders with the macOS `say` voice to check timing without a key; `--voice ID` and `--model ID` override `script.json`; `--no-text` skips the overlays.

## Lessons learned

1. Probe time bases before stream-copying a concat; mismatched `time_base` values silently corrupt durations.
2. Look at the footage (contact sheets) before writing; timing decisions are cheap when you can see the cuts.
3. Expressive TTS models are slower. Budget about 30 % more time per line than a "neutral" model and cut words rather than speed audio.
4. Synthesise per line and cache by content; it keeps iteration fast and credits low.
5. python.org Python on macOS ships without root certificates. Use `certifi` for HTTPS calls.
