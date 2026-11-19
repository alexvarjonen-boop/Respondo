FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl python3-opencv \
        tesseract-ocr-fin tesseract-ocr-swe tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# Production gate: syntax checks and the full regression suite must pass
# before Railway can publish this image.
RUN bash scripts/provision-chat-image-objects.sh && npm run check && npm test

ENV NODE_ENV=production \
    RESPONDO_CHAT_IMAGE_OCR_DIR=/usr/share/tesseract-ocr/5/tessdata \
    RESPONDO_CHAT_IMAGE_OBJECT_PYTHON=/usr/bin/python3 \
    RESPONDO_CHAT_IMAGE_OBJECT_MODEL_DIR=/app/assets/chat-image-objects
EXPOSE 8080

CMD ["npm", "start"]
