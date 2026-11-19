"""Optional CPU-only recognition for the chat image analyzer.

The server already validates image format and dimensions. Run this helper with
trusted local Darknet configuration, weights and class labels. Output contains
only aggregated labels and counts for the supported classes.
"""

import json
from pathlib import Path
import re
import sys

if sys.platform.startswith("linux"):
    import resource

    limit = 768 * 1024 * 1024
    current, hard = resource.getrlimit(resource.RLIMIT_AS)
    resource.setrlimit(resource.RLIMIT_AS, (limit if current < 0 else min(current, limit), hard))

import cv2
import numpy as np


MAX_PIXELS = 8_000_000
MAX_BYTES = 2_000_000
MAX_CANDIDATES = 250
CONFIDENCE = 0.62
NMS_OVERLAP = 0.45


def load_model(directory):
    labels = {}
    for language in ("fi", "sv", "en"):
        words = (directory / f"detector.{language}.names").read_text(encoding="utf-8").splitlines()
        labels[language] = [word.strip() for word in words]
        if not words or len(words) > 250 or any(
            not word or len(word) > 70 or not all(char.isprintable() for char in word)
            for word in labels[language]
        ):
            raise ValueError("Invalid detector labels")
    if len({len(words) for words in labels.values()}) != 1:
        raise ValueError("Translated class lists must match")

    config = directory / "detector.cfg"
    header = config.read_text(encoding="utf-8").split("[", 2)[1]
    size = tuple(int(re.search(rf"^\s*{key}\s*=\s*(\d+)\s*$", header, re.M)[1]) for key in ("width", "height"))
    if not all(96 <= side <= 640 for side in size):
        raise ValueError("Unsupported detector input size")

    network = cv2.dnn.readNetFromDarknet(str(config), str(directory / "detector.weights"))
    return network, size, labels


def forward(network, size, pixels):
    blob = cv2.dnn.blobFromImage(pixels, scalefactor=1 / 255, size=size, swapRB=True)
    network.setInput(blob)
    return network.forward(network.getUnconnectedOutLayersNames())


def recognize(network, size, labels, image):
    height, width = image.shape[:2]
    if not (1 <= width <= 4096 and 1 <= height <= 4096 and width * height <= MAX_PIXELS):
        return []

    # Letterbox rather than stretch, preserving the shape of visible objects.
    model_width, model_height = size
    scale = min(model_width / width, model_height / height)
    image_width = max(1, round(width * scale))
    image_height = max(1, round(height * scale))
    left = (model_width - image_width) // 2
    top = (model_height - image_height) // 2
    padded = np.full((model_height, model_width, 3), 114, dtype=np.uint8)
    padded[top:top + image_height, left:left + image_width] = cv2.resize(image, (image_width, image_height))

    candidates = []
    for output in forward(network, size, padded):
        for row in output:
            scores = row[5:]
            label = int(np.argmax(scores))
            confidence = float(scores[label])
            if not np.isfinite(confidence) or confidence < CONFIDENCE:
                continue
            center_x, center_y, box_width, box_height = row[:4] * [model_width, model_height, model_width, model_height]
            if not all(np.isfinite([center_x, center_y, box_width, box_height])):
                continue
            x = max(left, center_x - box_width / 2)
            y = max(top, center_y - box_height / 2)
            w = min(left + image_width, center_x + box_width / 2) - x
            h = min(top + image_height, center_y + box_height / 2) - y
            if w >= 4 and h >= 4:
                candidates.append((confidence, label, [float(x), float(y), float(w), float(h)]))

    by_class = {}
    for confidence, label, box in sorted(candidates, key=lambda item: item[0], reverse=True)[:MAX_CANDIDATES]:
        boxes, scores = by_class.setdefault(label, ([], []))
        boxes.append(box)
        scores.append(confidence)

    counts = []
    for label, (boxes, scores) in by_class.items():
        remaining = cv2.dnn.NMSBoxes(boxes, scores, CONFIDENCE, NMS_OVERLAP)
        if len(remaining):
            counts.append({"label": labels[label], "count": len(remaining)})
    return sorted(counts, key=lambda item: -item["count"])[:8]


def main():
    cv2.setNumThreads(1)
    directory = Path(sys.argv[1])
    mode = sys.argv[2]
    network, size, labels = load_model(directory)
    if mode == "probe":
        width, height = size
        outputs = forward(network, size, np.zeros((height, width, 3), dtype=np.uint8))
        if not outputs or any(output.ndim != 2 or output.shape[1] != 5 + len(labels["en"]) for output in outputs):
            raise ValueError("Model output does not match the label list")
        print('{"ready": true}')
        return

    image_bytes = sys.stdin.buffer.read(MAX_BYTES + 1)
    if not image_bytes or len(image_bytes) > MAX_BYTES:
        raise ValueError("Invalid image")
    image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR | cv2.IMREAD_IGNORE_ORIENTATION)
    if image is None:
        print('{"objects": []}')
        return
    print(json.dumps({"objects": recognize(network, size, labels[mode], image)}))


if __name__ == "__main__":
    main()
