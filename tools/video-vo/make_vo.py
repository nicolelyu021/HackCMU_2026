#!/usr/bin/env python3
"""Add an English voice-over, burned-in captions and on-screen labels to a video.

  python3 make_vo.py --video ../../Videos/pinlog_demo_concat.mp4 [--preview] [--voice ID] [--model ID] [--no-text]

TTS: ElevenLabs (ELEVENLABS_API_KEY in the environment or the repo-root .env).
--preview uses the macOS `say` voice so timing can be checked without a key.
Each cue in script.json is synthesised once (cached under build/ by text+voice+model) and placed at
its `at` timestamp over the original soundtrack at reduced volume. Captions, location labels and
title cards are rendered with Pillow into RGBA PNGs and composited with ffmpeg's overlay filter
(this Homebrew ffmpeg has no libass/drawtext), each with a short fade in/out.
"""
import argparse, hashlib, json, os, re, ssl, subprocess, sys, urllib.request, urllib.error
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
BED_VOLUME = 0.22            # original soundtrack under the voice
TAG_RE = re.compile(r"\s*\[[^\]]+\]\s*")
FONT_DIR = Path("/System/Library/Fonts/Supplemental")
FONTS = {
    "caption": FONT_DIR / "Avenir Next.ttc",
    "label":   FONT_DIR / "MarkerFelt.ttc",
    "card":    FONT_DIR / "MarkerFelt.ttc",
}


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


def probe(path, key):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0" if key != "duration" else "a:0",
                                   "-show_entries", f"stream={key}" if key != "duration" else "format=duration",
                                   "-of", "csv=p=0", str(path)])
    return out.decode().strip()


def duration(path):
    return float(probe(path, "duration"))


def ssl_context():
    try:
        import certifi                      # python.org builds on macOS ship without root certs
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def strip_tags(text):
    return re.sub(r"\s{2,}", " ", TAG_RE.sub(" ", text)).strip()


# ---------------------------------------------------------------- TTS
def tts_elevenlabs(text, voice, model, key, out_path):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128"
    if model.startswith("eleven_v3"):
        settings = {"stability": 0.35, "similarity_boost": 0.8}          # v3: lower stability = more expressive
    else:
        text = strip_tags(text)
        settings = {"stability": 0.4, "similarity_boost": 0.8, "style": 0.5, "speed": 1.05}
    body = json.dumps({"text": text, "model_id": model, "voice_settings": settings}).encode()
    req = urllib.request.Request(url, data=body, method="POST",
                                 headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    try:
        with urllib.request.urlopen(req, timeout=120, context=ssl_context()) as r:
            out_path.write_bytes(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs {e.code}: {e.read().decode(errors='replace')}")


def tts_say(text, out_path):
    aiff = out_path.with_suffix(".aiff")
    run(["say", "-v", "Samantha", "-r", "185", "-o", str(aiff), strip_tags(text)])
    run(["ffmpeg", "-y", "-v", "error", "-i", str(aiff), str(out_path)])


def synth_cues(cues, a, key, work, total):
    segs = []
    for i, cue in enumerate(cues):
        sig = f"{'say' if a.preview else a.model}|{a.voice}|{cue['text']}"
        mp3 = work / f"cue{i:02d}_{hashlib.sha1(sig.encode()).hexdigest()[:8]}.mp3"
        if not mp3.exists():
            if a.preview:
                tts_say(cue["text"], mp3)
            else:
                tts_elevenlabs(cue["text"], a.voice, a.model, key, mp3)
        nxt = cues[i + 1]["at"] if i + 1 < len(cues) else total
        slot = nxt - cue["at"] - 0.25
        wav = fit_clip(mp3, slot)
        d = duration(wav)
        flag = "" if cue["at"] + d <= nxt + 0.3 else "  <-- still overruns next cue: shorten the line or move `at`"
        print(f"cue {i}: at {cue['at']:5.1f}s  len {d:4.1f}s  ends {cue['at']+d:5.1f}s (next {nxt:5.1f}s){flag}")
        segs.append({"at": cue["at"], "end": min(cue["at"] + d, nxt - 0.15, total), "mp3": wav,
                     "caption": cue.get("caption") or strip_tags(cue["text"])})
    return segs


MAX_TEMPO = 1.12   # never speed a line up by more than this; beyond it the read sounds rushed


def fit_clip(mp3, slot):
    """Trim silence at both ends; if the line is still longer than its slot, speed it up (capped)."""
    trimmed = mp3.with_suffix(".trim.wav")
    run(["ffmpeg", "-y", "-v", "error", "-i", str(mp3), "-af",
         "silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.08,"
         "areverse,silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.12,areverse", str(trimmed)])
    d = duration(trimmed)
    if d <= slot:
        return trimmed
    tempo = min(MAX_TEMPO, d / slot)
    fitted = mp3.with_suffix(".fit.wav")
    run(["ffmpeg", "-y", "-v", "error", "-i", str(trimmed), "-af", f"atempo={tempo:.3f}", str(fitted)])
    print(f"   ({mp3.name}: {d:.1f}s trimmed, x{tempo:.2f} tempo -> {duration(fitted):.1f}s for a {slot:.1f}s slot)")
    return fitted


# ---------------------------------------------------------------- text overlays (Pillow → RGBA PNG)
def make_overlays(segs, labels, cards, W, H, work, want_text):
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    items = []
    if not want_text:
        return items
    s = H / 720                                    # scale factor so sizes are tuned for 720p

    def png(name, draw_fn):
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw_fn(img, ImageDraw.Draw(img))
        p = work / f"{name}.png"
        img.save(p)
        return p

    def shadowed(img, draw, xy, text, font, fill, anchor, blur=6, shadow=(0, 0, 0, 150)):
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).text((xy[0] + 2 * s, xy[1] + 3 * s), text, font=font, fill=shadow, anchor=anchor)
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur * s)))
        draw.text(xy, text, font=font, fill=fill, anchor=anchor)

    # captions: bottom centre, white on soft dark pill
    cap_font = ImageFont.truetype(str(FONTS["caption"]), int(30 * s), index=2)   # Avenir Next Demi Bold
    for i, seg in enumerate(segs):
        def draw_cap(img, draw, text=seg["caption"]):
            words, lines, cur = text.split(), [], ""
            for w in words:
                trial = (cur + " " + w).strip()
                if draw.textlength(trial, font=cap_font) > W * 0.78 and cur:
                    lines.append(cur); cur = w
                else:
                    cur = trial
            lines.append(cur)
            lh = int(40 * s)
            block_h = lh * len(lines)
            y0 = H - int(58 * s) - block_h
            widest = max(draw.textlength(l, font=cap_font) for l in lines)
            pad = int(22 * s)
            box = [W / 2 - widest / 2 - pad, y0 - int(10 * s), W / 2 + widest / 2 + pad, y0 + block_h + int(8 * s)]
            pill = Image.new("RGBA", img.size, (0, 0, 0, 0))
            ImageDraw.Draw(pill).rounded_rectangle(box, radius=int(16 * s), fill=(20, 18, 16, 135))
            img.alpha_composite(pill)
            for k, line in enumerate(lines):
                draw.text((W / 2, y0 + k * lh), line, font=cap_font, fill=(255, 250, 240, 255), anchor="ma")
        items.append({"png": png(f"cap{i:02d}", draw_cap), "at": seg["at"], "end": seg["end"], "fade": 0.25})

    # labels: top-left handwritten tag with a purple pin dot
    lab_font = ImageFont.truetype(str(FONTS["label"]), int(40 * s), index=1)     # Marker Felt Wide
    for i, lab in enumerate(labels):
        def draw_lab(img, draw, text=lab["text"]):
            x, y = int(52 * s), int(44 * s)
            draw.ellipse([x, y + int(14 * s), x + int(18 * s), y + int(32 * s)], fill=(110, 84, 168, 255))
            shadowed(img, draw, (x + int(32 * s), y), text, lab_font, (255, 252, 246, 255), "la")
        items.append({"png": png(f"lab{i:02d}", draw_lab), "at": lab["at"], "end": lab["end"], "fade": 0.35})

    # cards: centred title
    big = ImageFont.truetype(str(FONTS["card"]), int(110 * s), index=1)
    small = ImageFont.truetype(str(FONTS["caption"]), int(30 * s), index=2)
    for i, card in enumerate(cards):
        def draw_card(img, draw, card=card):
            shadowed(img, draw, (W / 2, H * 0.42), card["text"], big, (255, 252, 246, 255), "mm", blur=10, shadow=(0, 0, 0, 190))
            if card.get("sub"):
                shadowed(img, draw, (W / 2, H * 0.42 + int(90 * s)), card["sub"], small, (255, 252, 246, 235), "mm", blur=8)
        items.append({"png": png(f"card{i:02d}", draw_card), "at": card["at"], "end": card["end"], "fade": 0.5})
    return items


# ---------------------------------------------------------------- mix + composite
def render(video, segs, items, out):
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(video)]
    for seg in segs:
        cmd += ["-i", str(seg["mp3"])]
    for it in items:
        cmd += ["-loop", "1", "-i", str(it["png"])]
    parts = [f"[0:a]volume={BED_VOLUME}[bed]"]
    labels = ["[bed]"]
    for i, seg in enumerate(segs):
        ms = int(seg["at"] * 1000)
        parts.append(f"[{i+1}:a]aresample=44100,adelay={ms}|{ms},apad[v{i}]")
        labels.append(f"[v{i}]")
    parts.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=first,alimiter=limit=0.95[a]")
    vin = "[0:v]"
    base = 1 + len(segs)
    for i, it in enumerate(items):
        st, en, fd = it["at"], it["end"], it["fade"]
        parts.append(f"[{base+i}:v]format=rgba,trim=duration={en-st:.3f},setpts=PTS-STARTPTS+{st:.3f}/TB,"
                     f"fade=in:st={st:.3f}:d={fd}:alpha=1,fade=out:st={en-fd:.3f}:d={fd}:alpha=1[t{i}]")
        parts.append(f"{vin}[t{i}]overlay=0:0:eof_action=pass:enable='between(t,{st:.3f},{en:.3f})'[o{i}]")
        vin = f"[o{i}]"
    parts.append(f"{vin}format=yuv420p[vout]")
    cmd += ["-filter_complex", ";".join(parts), "-map", "[vout]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart", str(out)]
    run(cmd)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--voice", help="ElevenLabs voice id (default: script.json `voice`)")
    ap.add_argument("--model", help="ElevenLabs model id (default: script.json `model`)")
    ap.add_argument("--preview", action="store_true", help="use macOS say instead of ElevenLabs")
    ap.add_argument("--no-text", action="store_true", help="skip captions/labels/cards")
    ap.add_argument("--out")
    a = ap.parse_args()

    spec = json.loads((HERE / "script.json").read_text())
    a.voice = a.voice or spec.get("voice", "EXAVITQu4vr4xnSDxMaL")
    a.model = a.model or spec.get("model", "eleven_multilingual_v2")
    video = Path(a.video).resolve()
    work = HERE / "build"
    work.mkdir(parents=True, exist_ok=True)
    out = Path(a.out) if a.out else video.with_name(video.stem + "_vo" + ("_preview" if a.preview else "") + ".mp4")

    key = None
    if not a.preview:
        key = load_env_key()
        if not key:
            sys.exit("ELEVENLABS_API_KEY not set (env or repo-root .env). Use --preview to hear the timing with a system voice.")

    total = duration(video)
    W, H = (int(x) for x in probe(video, "width,height").split(","))
    segs = synth_cues(spec["cues"], a, key, work, total)
    items = make_overlays(segs, spec.get("labels", []), spec.get("cards", []), W, H, work, not a.no_text)
    render(video, segs, items, out)
    print("wrote", out)


if __name__ == "__main__":
    main()
