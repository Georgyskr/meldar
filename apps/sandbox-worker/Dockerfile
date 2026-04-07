FROM docker.io/cloudflare/sandbox:0.8.4@sha256:12471f7123d38ecb9c2aadcb571aabad04ac49b05c5b7101d5133fc0592cba89

WORKDIR /app

# Install Next.js starter deps first for Docker layer caching
COPY sandbox-app/package.json sandbox-app/pnpm-lock.yaml ./
RUN npm install -g pnpm@10.18.3 && pnpm install --frozen-lockfile

# Copy the rest of the starter
COPY sandbox-app/ ./

# Required during local development for wrangler to tunnel the port
# Next.js runs on 3001 because port 3000 is reserved by the Cloudflare Sandbox runtime
EXPOSE 3001
