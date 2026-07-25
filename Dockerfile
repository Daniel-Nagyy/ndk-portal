# Playwright base image ships Node.js + Chromium + all system libraries the
# Netradyne headless login (netradyne/auth.js) needs. Tag matches playwright@^1.61.0.
FROM mcr.microsoft.com/playwright:v1.61.0-jammy

WORKDIR /app

# Install build tools needed for better-sqlite3 native module compilation
RUN apt-get update && apt-get install -y \
    make \
    gcc \
    g++ \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# App source.
COPY . .

# Railway terminates TLS at its edge and injects PORT; run plain HTTP.
ENV USE_HTTP=1
ENV NODE_ENV=production

# Documentation only — Railway maps its own PORT.
EXPOSE 4174

CMD ["node", "server.mjs"]
