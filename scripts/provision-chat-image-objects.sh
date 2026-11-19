#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
weights=assets/chat-image-objects/detector.weights
sha=cf9fbfd0f6d4869b35762f56100f50ed05268084078805f0e7989efe5bb8ca87

if printf '%s  %s\n' "$sha" "$weights" | sha256sum --check --status; then
  exit 0
fi

tmp=$(mktemp "${weights}.XXXXXX")
trap 'rm -f "$tmp"' EXIT
curl --fail --silent --show-error --location --connect-timeout 15 --max-time 90 --retry 2 \
  --output "$tmp" https://github.com/AlexeyAB/darknet/releases/download/yolov4/yolov4-tiny.weights
printf '%s  %s\n' "$sha" "$tmp" | sha256sum --check --status
mv "$tmp" "$weights"
