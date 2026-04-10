FROM docker.io/cloudflare/sandbox:0.8.8

WORKDIR /app

COPY sandbox-app/package.json ./
RUN npm install

COPY sandbox-app/ ./

EXPOSE 3001
