# Imagem explícita Node 24 — Prisma 7 exige 20.19+, 22.12+ ou 24+;
# Railpack/Nixpacks no painel pode ignorar nixpacks.toml e usar Node 18.
# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim

RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start:prod"]
