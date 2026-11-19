"""Detect visible building windows using an isolated local Grounding DINO worker."""

from io import BytesIO
import json
import math
from pathlib import Path
import resource
import sys

# The worker handles one limited image and runs once. A hard ceiling prevents
# the model or a decoder failure from exhausting the web service's memory.
resource.setrlimit(resource.RLIMIT_AS, (4 * 1024 ** 3, 4 * 1024 ** 3))

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps


SIZE = 800
MAX_BYTES = 2_000_000
Image.MAX_IMAGE_PIXELS = 8_000_000

# BERT token IDs from the pinned model for:
# "building window. door. vehicle window. mirror."
TOKENS = [[101, 2311, 3332, 1012, 2341, 1012, 4316, 3332, 1012, 5259, 1012, 102]]
WINDOW_TOKEN = 2
COMPETING_TOKENS = [4, 6, 7, 9]
WINDOW_THRESHOLD = 0.30
MEAN = np.array([.485, .456, .406], dtype=np.float32)
STD = np.array([.229, .224, .225], dtype=np.float32)


def model_session(model):
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    return ort.InferenceSession(str(model), options, providers=["CPUExecutionProvider"])


def input_data(image):
    pixels = np.asarray(image.resize((SIZE, SIZE), Image.Resampling.BILINEAR), dtype=np.float32)
    pixels = (pixels / 255 - MEAN) / STD
    token_ids = np.asarray(TOKENS, dtype=np.int64)
    return {
        "pixel_values": np.ascontiguousarray(pixels.transpose(2, 0, 1)[None]),
        "input_ids": token_ids,
        "token_type_ids": np.zeros_like(token_ids),
        "attention_mask": np.ones_like(token_ids),
        "pixel_mask": np.ones((1, SIZE, SIZE), dtype=np.int64),
    }


def candidate_boxes(logits, boxes):
    selected = []
    window_scores = logits[:, WINDOW_TOKEN]
    cutoff = math.log(WINDOW_THRESHOLD / (1 - WINDOW_THRESHOLD))
    for index in np.argsort(window_scores)[::-1]:
        score = window_scores[index]
        if not np.isfinite(score) or score < cutoff:
            continue
        if np.max(logits[index, COMPETING_TOKENS]) >= score:
            continue
        x, y, width, height = boxes[index]
        if not np.isfinite(boxes[index]).all() or min(width, height) < .015 or width * height > .70:
            continue
        left, top = max(0., x - width / 2), max(0., y - height / 2)
        right, bottom = min(1., x + width / 2), min(1., y + height / 2)
        if right - left < .015 or bottom - top < .015:
            continue
        area = (right - left) * (bottom - top)
        duplicate = False
        for a, b, c, d in selected:
            intersection = max(0., min(c, right) - max(a, left)) * max(0., min(d, bottom) - max(b, top))
            if intersection > .65 * min(area, (c - a) * (d - b)):
                duplicate = True
                break
        if not duplicate:
            selected.append((left, top, right, bottom))
        if len(selected) > 60:
            return []
    return selected


def main():
    model = Path(sys.argv[1])
    mode = sys.argv[2]
    if mode == "probe":
        session = model_session(model)
        if [output.name for output in session.get_outputs()] != ["logits", "pred_boxes"]:
            raise ValueError("Unexpected window detector output")
        print('{"ready":true}')
        return

    image_bytes = sys.stdin.buffer.read(MAX_BYTES + 1)
    if not image_bytes or len(image_bytes) > MAX_BYTES:
        raise ValueError("Invalid image")
    with Image.open(BytesIO(image_bytes), formats=["JPEG", "PNG"]) as photo:
        if photo.width * photo.height > Image.MAX_IMAGE_PIXELS or max(photo.size) > 4096:
            raise ValueError("Unsupported image dimensions")
        image = ImageOps.exif_transpose(photo).convert("RGB")
    logits, boxes = model_session(model).run(None, input_data(image))
    print(json.dumps({"count": len(candidate_boxes(logits[0], boxes[0]))}))


if __name__ == "__main__":
    main()
