FROM docker.io/cloudflare/sandbox:0.8.8

# fuser (psmisc) and pkill (procps) are not in the base image's minimal
# install but are used by handler.ts's handleStop. curl is pinned because
# the base image's install set isn't contract-stable.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		psmisc \
		procps \
		curl \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY sandbox-app/package.json sandbox-app/package-lock.json ./
RUN npm ci

COPY sandbox-app/ ./

# Panda CSS generates styled-system/ from panda.config.ts. Without this the
# Next dev server fails with "Module not found: Can't resolve 'styled-system/jsx'"
# the moment the LLM writes any component using Panda primitives.
RUN npx panda codegen --silent && test -f /app/styled-system/jsx/index.mjs

# Warm Turbopack's on-disk cache so the first runtime request doesn't pay
# the full cold-compile cost. Start `next dev`, hit the root URL to trigger
# compile, then shut it down. The `.next/cache` layer persists in the image.
# Fail the build loudly if warmup didn't produce a 2xx — shipping a cold
# image silently means every first request in prod pays full cold-compile.
RUN (npm run dev > /tmp/build-time-dev.log 2>&1 &) \
	&& WARMED=false; \
	for i in $(seq 1 30); do \
		if curl -sf -o /dev/null --max-time 3 http://127.0.0.1:3001/; then \
			echo "warmed on attempt $i"; WARMED=true; break; \
		fi; \
		sleep 1; \
	done; \
	pkill -f "next dev" 2>/dev/null || true; \
	sleep 2; \
	if [ "$WARMED" != "true" ]; then \
		echo "build-time-dev.log:"; tail -200 /tmp/build-time-dev.log; \
		echo "warmup failed — refusing to ship a cold image"; \
		exit 1; \
	fi

EXPOSE 3001
