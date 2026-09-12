#!/usr/bin/env python3
"""Add an English AI voice-over to a video.

  python3 make_vo.py --video ../../Videos/pinlog_demo_concat.mp4 [--voice VOICE_ID] [--preview]

TTS: ElevenLabs (needs ELEVENLABS_API_KEY in the environment or in the repo-root .env).
--preview uses the macOS `say` voice instead, so timing can be checked without a key.
Each cue in script.json is synthesised separately and placed at its `at` timestamp;
the original soundtrack is kept underneath at reduced volume.
"""
import argparse, json, os, subprocess, sys, urllib.request, urllib.error
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL"   # Sarah, warm narrator (ElevenLabs default library)
MODEL_ID = "eleven_multilingual_v2"
BED_VOLUME = 0.22   # original soundtrack under the voice


def load_env_key():
    if os.environ.get("ELEVENLABS_API_KEY"):
        return os.environ["ELEVENLABS_API_KEY"]
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("ELEVENLABS_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"')
    return None


def run(cmd):
    subprocess.run(cmd, check=True)


def duration(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "csv=p=0", str(path)])
    return float(out)


def tts_elevenlabs(text, voice, key, out_path):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128"
    body = json.dumps({"text": text, "model_id": MODEL_ID,
                       "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.3, "speed": 1.05}}).encode()
    req = urllib.request.Request(url, data=body, method="POST",
                                 headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            out_path.write_bytes(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs {e.code}: {e.read().decode(errors='replace')}")


def tts_say(text, out_path):
    aiff = out_path.with_suffix(".aiff")
    run(["say", "-v", "Samantha", "-r", "185", "-o", str(aiff), text])
    run(["ffmpeg", "-y", "-v", "error", "-i", str(aiff), str(out_path)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--voice", default=DEFAULT_VOICE, help="ElevenLabs voice id")
    ap.add_argument("--preview", action="store_true", help="use macOS say instead of ElevenLabs")
    ap.add_argument("--out")
    a = ap.parse_args()

    video = Path(a.video).resolve()
    cues = json.loads((HERE / "script.json").read_text())["cues"]
    work = HERE / "build" / ("preview" if a.preview else "elevenlabs")
    work.mkdir(parents=True, exist_ok=True)
    out = Path(a.out) if a.out else video.with_name(video.stem + "_vo" + ("_preview" if a.preview else "") + ".mp4")

    key = None
    if not a.preview:
        key = load_env_key()
        if not key:
            sys.exit("ELEVENLABS_API_KEY not set (env or repo-root .env). Use --preview to hear the timing with a system voice.")

    total = duration(video)
    segs = []
    for i, cue in enumerate(cues):
        mp3 = work / f"cue{i:02d}.mp3"
        if a.preview:
            tts_say(cue["text"], mp3)
        else:
            tts_elevenlabs(cue["text"], a.voice, key, mp3)
        d = duration(mp3)
        nxt = cues[i + 1]["at"] if i + 1 < len(cues) else total
        flag = "" if cue["at"] + d <= nxt + 0.3 else "  <-- overruns next cue: shorten the line or move `at`"
        print(f"cue {i}: at {cue['at']:5.1f}s  len {d:4.1f}s  ends {cue['at']+d:5.1f}s (next {nxt:5.1f}s){flag}")
        segs.append((cue["at"], mp3))

    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(video)]
    for _, mp3 in segs:
        cmd += ["-i", str(mp3)]
    parts = [f"[0:a]volume={BED_VOLUME}[bed]"]
    labels = ["[bed]"]
    for i, (at, _) in enumerate(segs):
        ms = int(at * 1000)
        parts.append(f"[{i+1}:a]aresample=44100,adelay={ms}|{ms},apad[v{i}]")
        labels.append(f"[v{i}]")
    parts.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=first,alimiter=limit=0.95[a]")
    cmd += ["-filter_complex", ";".join(parts), "-map", "0:v", "-map", "[a]",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)]
    run(cmd)
    print("wrote", out)


if __name__ == "__main__":
    main()
