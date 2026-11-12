#!/usr/bin/env python3
"""
Download Font Awesome 6 Free SVG icons for local, offline use.
Icons are saved to assets/icons/{solid,regular}/.

Source: @fortawesome/fontawesome-free on jsDelivr (CC BY 4.0 license).
Web Awesome's bundled icons ARE Font Awesome, so these are the exact same
icon shapes the project currently renders via the WA CDN.
"""

import os
import ssl
import sys
import time
import urllib.request
from urllib.error import HTTPError, URLError

# macOS doesn't ship with CA certs accessible to Python out of the box;
# bypass verification for this one-time download script.
_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE

BASE = "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.7.2/svgs"

# All solid icons used in the UI templates AND in data/icons.js picker.
SOLID_ICONS = sorted(set([
    # ── UI template icons ──
    "arrow-down-a-z", "arrow-right", "ban", "bars", "book-open", "check",
    "chevron-down", "clock", "eye", "eye-slash", "font", "layer-group",
    "link", "magnifying-glass", "plus", "sliders", "star", "sun", "tag",
    "trash", "wind", "xmark",
    # ── Nature ──
    "leaf", "moon", "cloud", "snowflake", "fire", "droplet", "mountain",
    "tree", "seedling", "feather", "paw", "fish", "dove", "horse",
    "spider", "dragon", "cat", "dog", "frog", "otter", "hippo", "crow",
    # ── People ──
    "user", "users", "baby", "crown", "graduation-cap", "heart", "shield",
    "person-walking", "person-running", "hand-fist", "user-ninja",
    "user-secret", "mask", "brain", "person-dress", "person-praying",
    "hand", "face-smile", "child", "person-hiking", "person-skating",
    "person-skiing", "person-snowboarding",
    # ── Objects ──
    "key", "gem", "scroll", "book", "map", "compass", "box", "vial",
    "wand-magic", "lightbulb", "shield-halved", "flask", "ring", "coins",
    "sack-dollar", "lock", "envelope", "camera", "music", "guitar",
    "dumbbell", "hammer", "wrench", "scissors",
    # ── Places ──
    "house", "building", "warehouse", "store", "tent", "anchor", "flag",
    "landmark", "tower-observation", "bridge", "road", "ship", "train",
    "plane", "rocket", "dungeon", "church", "mosque", "synagogue",
    "tree-city", "school", "hospital", "hotel", "city",
    # ── Events ──
    "bolt", "bomb", "trophy", "skull", "cloud-bolt", "calendar", "bell",
    "handshake", "file-signature", "gavel", "chess", "dice", "question",
    "exclamation", "fire-flame-curved", "gift", "cake-candles",
    "champagne-glasses", "mug-hot", "utensils", "briefcase", "clipboard",
    # ── Symbols ──
    "circle", "diamond", "hexagon", "triangle-exclamation", "stop",
    "infinity", "asterisk", "octagon", "bolt-lightning", "yin-yang",
    "peace", "cross", "ankh", "atom", "dna", "square", "certificate",
    "ribbon", "award", "star-of-life", "flag-checkered", "bookmark",
    "mars", "venus", "mars-and-venus",
]))

# Regular (outline) variant icons — used with variant="regular" in templates.
REGULAR_ICONS = sorted(set([
    "star", "eye", "eye-slash", "clock", "bookmark", "heart", "sun",
    "book-open",
]))


def fetch(style, name):
    url = f"{BASE}/{style}/{name}.svg"
    req = urllib.request.Request(url, headers={"User-Agent": "Storier/1.0"})
    with urllib.request.urlopen(req, timeout=15, context=_SSL_CTX) as r:
        return r.read().decode("utf-8")


def main():
    root = os.path.join(os.path.dirname(__file__), "..", "assets", "icons")
    solid_dir = os.path.join(root, "solid")
    reg_dir = os.path.join(root, "regular")
    os.makedirs(solid_dir, exist_ok=True)
    os.makedirs(reg_dir, exist_ok=True)

    failed = []
    ok = 0
    skip = 0

    for style, icons, out_dir in [("solid", SOLID_ICONS, solid_dir),
                                  ("regular", REGULAR_ICONS, reg_dir)]:
        for name in icons:
            path = os.path.join(out_dir, f"{name}.svg")
            if os.path.exists(path):
                skip += 1
                continue
            try:
                content = fetch(style, name)
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                ok += 1
                print(f"  ok   {style}/{name}")
            except HTTPError as e:
                failed.append(f"{style}/{name}: HTTP {e.code}")
                print(f"  FAIL {style}/{name}: HTTP {e.code}")
            except URLError as e:
                failed.append(f"{style}/{name}: {e}")
                print(f"  FAIL {style}/{name}: {e}")
            time.sleep(0.03)

    print(f"\nDownloaded {ok}, skipped {skip} (cached), failed {len(failed)}.")
    if failed:
        print("Missing icons (will need manual substitution):")
        for f in failed:
            print(f"  {f}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
