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

COPY sandbox-app/package.json ./
RUN npm install

COPY sandbox-app/ ./

EXPOSE 3001
