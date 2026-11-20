# Google Cloud Run Container — Node.js 20 + Headless Playwright Chromium (390x844 Mobile Audits)
# Build from repository root: docker build -f cloudrun/Dockerfile -t pramana-ai-api .
FROM mcr.microsoft.com/playwright:v1.49.0-noble

ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

COPY cloudrun/package.json ./cloudrun/package.json
RUN cd cloudrun && npm install --omit=dev

COPY api ./api
COPY cloudrun/server.mjs ./cloudrun/server.mjs

EXPOSE 8080
CMD ["node", "cloudrun/server.mjs"]
