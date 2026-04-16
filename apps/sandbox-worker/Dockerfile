FROM docker.io/cloudflare/sandbox:0.8.8

RUN echo 'Acquire::Retries "3";' > /etc/apt/apt.conf.d/80-retries \
	&& echo 'Acquire::By-Hash "yes";' > /etc/apt/apt.conf.d/80-by-hash \
	&& apt-get update \
	&& apt-get install -y --no-install-recommends \
		psmisc \
		procps \
		curl \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY sandbox-app/package.json sandbox-app/package-lock.json ./
RUN npm ci

COPY sandbox-app/ ./

RUN npx panda codegen --silent && test -f /app/styled-system/jsx/index.mjs

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
