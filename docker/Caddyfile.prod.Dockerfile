# # FE build
# FROM node:22-alpine AS fe
# WORKDIR /fe
# COPY core/frontend/package*.json ./
# RUN npm ci
# COPY core/frontend ./
# RUN npm run build

# # -- BEGIN Runtime
# FROM caddy:alpine
# COPY docker/Caddyfile /etc/caddy/Caddyfile
# COPY --from=fe /fe/dist /srv/public



# FROM node:22-alpine AS fe
# WORKDIR /app
# COPY core/frontend/package*.json core/frontend/
# RUN cd core/frontend && npm ci
# COPY core ./core
# RUN cd core/frontend && npm run build

# # Runtime: Caddy
# FROM caddy:alpine
# COPY docker/Caddyfile /etc/caddy/Caddyfile
# COPY --from=fe /app/core/frontend/dist /srv/public

# FE build
FROM node:22-alpine AS fe
WORKDIR /app

ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY core/frontend/package*.json core/frontend/
RUN cd core/frontend && npm ci --no-audit --fund=false

COPY core ./core

RUN cd core/frontend && npm run build

# BEGIN -- Runtime Caddy
FROM caddy:alpine
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=fe /app/core/frontend/dist /srv/public
