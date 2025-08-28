# build
FROM node:22-alpine AS be
WORKDIR /app/core/backend
COPY core/backend/package*.json ./
RUN npm ci
COPY core/backend ./
RUN npm run build

RUN mkdir -p /app/core/backend/data
RUN mkdir -p /data

# BEGIN -- runtime
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY core/backend/package*.json ./core/backend/
RUN cd core/backend && npm ci --omit=dev \
	&& npm i chalk@5 --no-audit --fund=false
# dist
COPY --from=be /app/core/backend/dist ./core/backend/dist

# Copy default avatars for GDPR ZIP export (backend reads from filesystem)
COPY core/frontend/public/default_*.png ./core/backend/public/
COPY core/frontend/public/deleted_avatar.png ./core/backend/public/

EXPOSE 3000
CMD ["node", "core/backend/dist/index.js"]
