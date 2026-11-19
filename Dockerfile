FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl python3-opencv python3-venv python3-pil \
        tesseract-ocr-fin tesseract-ocr-swe tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

RUN /usr/bin/python3 -m venv --system-site-packages /opt/respondo-window \
    && /opt/respondo-window/bin/pip install --no-cache-dir onnxruntime==1.24.3

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# Production gate: syntax checks and the full regression suite must pass
# before Railway can publish this image.
RUN bash scripts/provision-chat-image-objects.sh \
    && bash scripts/provision-chat-image-windows.sh \
    && env OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 /opt/respondo-window/bin/python -I \
        chat-image-windows.py assets/chat-image-objects/windows.onnx probe \
    && npm run check && npm test

ENV NODE_ENV=production \
    RESPONDO_CHAT_IMAGE_OCR_DIR=/usr/share/tesseract-ocr/5/tessdata \
    RESPONDO_CHAT_IMAGE_OBJECT_PYTHON=/usr/bin/python3 \
    RESPONDO_CHAT_IMAGE_OBJECT_MODEL_DIR=/app/assets/chat-image-objects \
    RESPONDO_CHAT_IMAGE_WINDOW_PYTHON=/opt/respondo-window/bin/python \
    RESPONDO_CHAT_IMAGE_WINDOW_MODEL=/app/assets/chat-image-objects/windows.onnx
EXPOSE 8080

CMD ["npm", "start"]
