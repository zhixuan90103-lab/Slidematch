#!/usr/bin/env python3
"""Pack yaw-2d 00–06+19–23 + rest still into yaw_strip.png. Requires ffmpeg."""

import glob
import os
import subprocess
import sys

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, "..", "src", "assets", "fx-preview", "yaw-2d"))
REPO = os.path.abspath(os.path.join(HERE, ".."))
FRAMES = [0, 1, 2, 3, 4, 5, 6, 19, 20, 21, 22, 23]
FOLDERS = ["drop", "leaf", "sun", "heart", "star", "convert", "magic", "magic_bai", "coin"]
REST = {
    "drop": "src/assets/piece-drop.png",
    "leaf": "src/assets/piece-leaf.png",
    "sun": "src/assets/piece-sun.png",
    "heart": "src/assets/piece-heart.png",
    "star": "src/assets/piece-star.png",
    "convert": "src/assets/piece-convert.png",
    "magic": "src/assets/piece-magic.png",
    "coin": "src/assets/coin.png",
}


def ffmpeg_hstack(inputs: list[str], out: str) -> int:
    labels = "".join(f"[{i}]" for i in range(len(inputs)))
    cmd = ["ffmpeg", "-y"]
    for p in inputs:
        cmd += ["-i", p]
    cmd += ["-filter_complex", f"{labels}hstack=inputs={len(inputs)}", "-pix_fmt", "rgba", out]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-2000:], file=sys.stderr)
    return r.returncode


def main() -> int:
    for folder in FOLDERS:
        d = os.path.join(ROOT, folder)
        frames = []
        for f in FRAMES:
            hits = [
                h
                for h in glob.glob(os.path.join(d, f"*yaw_{f:02d}.png"))
                if "strip" not in os.path.basename(h)
            ]
            if not hits:
                print(f"missing {folder} {f}", file=sys.stderr)
                return 1
            frames.append(hits[0])
        extra = os.path.join(REPO, REST[folder]) if folder in REST else frames[0]
        out = os.path.join(d, "yaw_strip.png")
        tmp = out + ".tmp.png"
        print("packing", folder)
        if ffmpeg_hstack(frames, tmp) != 0:
            return 1
        if ffmpeg_hstack([tmp, extra], out) != 0:
            return 1
        os.remove(tmp)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
