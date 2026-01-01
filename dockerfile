# syntax=docker/dockerfile:1.7

# -------------------------------------------------
# BUILD STAGE
# -------------------------------------------------
FROM node:18-alpine AS build

WORKDIR /app
ENV NODE_ENV=production

# Native build deps for canvas + sharp
RUN apk add --no-cache \
  python3 \
  make \
  g++ \
  cairo-dev \
  pango-dev \
  pixman-dev \
  freetype-dev \
  harfbuzz-dev \
  fribidi-dev \
  libpng-dev \
  jpeg-dev \
  vips-dev \
  glib-dev

# Copy package files first
COPY package.json package-lock.json ./

# Install deps (native modules compile HERE)
RUN npm ci --omit=dev

# Copy source
COPY . .

# -------------------------------------------------
# RUNTIME STAGE
# -------------------------------------------------
FROM node:18-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Runtime libs only (NO -dev packages)
RUN apk add --no-cache \
  cairo \
  pango \
  pixman \
  freetype \
  harfbuzz \
  fribidi \
  libpng \
  jpeg \
  vips \
  glib \
  libc6-compat

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy runtime artifacts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/index.js ./index.js
COPY --from=build /app/konva ./konva
COPY --from=build /app/utils ./utils

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 4000
CMD ["node", "index.js"]
