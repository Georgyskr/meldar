# Meldar Sandbox Spike Dockerfile
# Extends Cloudflare's sandbox base image (includes the sandbox runtime) and pre-installs
# a minimal Next.js 16 App Router starter so cold start doesn't include `npm install`.
FROM docker.io/cloudflare/sandbox:0.8.4

WORKDIR /app

# Install Next.js starter deps first for Docker layer caching
COPY sandbox-app/package.json sandbox-app/pnpm-lock.yaml* ./
RUN npm install

# Copy the rest of the starter
COPY sandbox-app/ ./

# Required during local development for wrangler to tunnel the port
# Next.js runs on 3001 because port 3000 is reserved by the Cloudflare Sandbox runtime
EXPOSE 3001
