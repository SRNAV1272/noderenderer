# syntax=docker/dockerfile:1.7

# =================================================
# BUILD STAGE
# =================================================
FROM node:18-alpine AS build

WORKDIR /app
ENV NODE_ENV=production

# -------------------------------------------------
# Native build deps + fonts (Alpine 3.21 compatible)
# -------------------------------------------------
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
    glib-dev \
    fontconfig \
    ttf-dejavu \
    ttf-liberation \
    ttf-freefont \
    font-noto \
    font-noto-cjk \
    font-noto-emoji

# Build font cache (CRITICAL)
RUN fc-cache -f -v

# -------------------------------------------------
# Install node deps
# -------------------------------------------------
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# =================================================
# RUNTIME STAGE
# =================================================
FROM node:18-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# -------------------------------------------------
# Runtime env variables
# -------------------------------------------------
ARG CORS_ORIGIN
ARG API_URL
ARG AUTH_TOKEN
ARG AES_KEY
ARG AES_IV
ARG adminusername
ARG username
ARG orgid

ENV CORS_ORIGIN=${CORS_ORIGIN}
ENV API_URL=${API_URL}
ENV AUTH_TOKEN=${AUTH_TOKEN}
ENV AES_KEY=${AES_KEY}
ENV AES_IV=${AES_IV}
ENV adminusername=${adminusername}
ENV username=${username}
ENV orgid=${orgid}

# -------------------------------------------------
# Runtime native deps + fonts
# -------------------------------------------------
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
    libc6-compat \
    fontconfig \
    ttf-dejavu \
    ttf-liberation \
    ttf-freefont \
    font-noto \
    font-noto-cjk \
    font-noto-emoji

# Rebuild font cache
RUN fc-cache -f -v

# -------------------------------------------------
# Create non-root user
# -------------------------------------------------
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# -------------------------------------------------
# Copy app from build stage
# -------------------------------------------------
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/index.js ./index.js
COPY --from=build /app/konva ./konva
COPY --from=build /app/utils ./utils

# If you have custom fonts, uncomment:
# COPY --from=build /app/fonts /usr/share/fonts/custom
# RUN fc-cache -f -v

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 4000
CMD ["node", "index.js"]
