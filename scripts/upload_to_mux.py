"""
Upload a video to Mux via URL import (Mux pulls straight from a public Google Drive link).

Server-to-server transfer — does NOT download/re-upload through this machine, so it is
far faster than a direct upload for large files.

Usage:
    # creds come from env or from ../.env.local (MUX_TOKEN_ID / MUX_TOKEN_SECRET)
    python scripts/upload_to_mux.py <google-drive-file-id> [passthrough-label]

The Drive file must be shared as "anyone with the link can view" (Mux fetches it anonymously).
"""
import os
import sys
import time
from pathlib import Path

import requests


def load_creds():
    tid = os.environ.get("MUX_TOKEN_ID")
    sec = os.environ.get("MUX_TOKEN_SECRET")
    if tid and sec:
        return tid, sec
    # fall back to project .env.local
    env_path = Path(__file__).resolve().parent.parent / ".env.local"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("MUX_TOKEN_ID="):
                tid = line.split("=", 1)[1].strip().strip('"').strip("'")
            elif line.startswith("MUX_TOKEN_SECRET="):
                sec = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not tid or not sec:
        sys.exit("Missing MUX_TOKEN_ID / MUX_TOKEN_SECRET (set env vars or .env.local)")
    return tid, sec


def main():
    if len(sys.argv) < 2:
        sys.exit("Usage: python scripts/upload_to_mux.py <gdrive-file-id> [passthrough]")
    file_id = sys.argv[1]
    passthrough = sys.argv[2] if len(sys.argv) > 2 else "webinar-upload"
    gdrive_url = f"https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t"

    auth = load_creds()

    print("Creating Mux asset from Google Drive URL...")
    res = requests.post(
        "https://api.mux.com/video/v1/assets",
        auth=auth,
        json={
            "input": [{"url": gdrive_url}],
            "playback_policies": ["public"],
            "video_quality": "basic",
            "passthrough": passthrough,
        },
    )
    if not res.ok:
        print(f"FAIL {res.status_code}: {res.text}")
        sys.exit(1)

    asset = res.json()["data"]
    asset_id = asset["id"]
    print(f"Asset created: {asset_id}  status: {asset['status']}")

    print("\nPolling for ready status...")
    for i in range(120):
        time.sleep(5)
        r = requests.get(f"https://api.mux.com/video/v1/assets/{asset_id}", auth=auth)
        data = r.json()["data"]
        status = data["status"]
        print(f"  [{i+1}] {status}")
        if status == "ready":
            pb = next((p["id"] for p in data.get("playback_ids", []) if p["policy"] == "public"), None)
            print("\nDone!")
            print(f"  Asset ID:    {asset_id}")
            print(f"  Playback ID: {pb}")
            print(f"  Stream URL:  https://stream.mux.com/{pb}.m3u8")
            return
        if status == "errored":
            print(f"\nMux errored: {data}")
            sys.exit(1)

    print(f"\nStill processing. Asset ID: {asset_id} — re-run or check Mux dashboard.")


if __name__ == "__main__":
    main()
