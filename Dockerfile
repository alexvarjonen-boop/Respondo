FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# Production gate: syntax checks and the full regression suite must pass
# before Railway can publish this image.
RUN npm run check && npm test && NODE_ENV=test node scripts/importer-live-audit.mjs

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
