#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
model=assets/chat-image-objects/windows.onnx
sha=70bf2d3310d1ae73769c96a71e00cbf2861eb33a1f4d97d84a108a7bf02c03c9
source_url=https://huggingface.co/onnx-community/grounding-dino-tiny-ONNX/resolve/ff690b0a8050566c290287545bd059350f3e9096/onnx/model_quantized.onnx

if [[ -f "$model" ]] && printf '%s  %s\n' "$sha" "$model" | sha256sum --check --status; then
  exit 0
fi

tmp=$(mktemp "${model}.XXXXXX")
trap 'rm -f "$tmp"' EXIT
curl --fail --silent --show-error --location --connect-timeout 15 --max-time 150 --retry 2 \
  --output "$tmp" "$source_url"
printf '%s  %s\n' "$sha" "$tmp" | sha256sum --check --status
mv "$tmp" "$model"
