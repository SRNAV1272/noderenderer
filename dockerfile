# -------------------------------------------------
# RUNTIME STAGE
# -------------------------------------------------
FROM node:18-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# -------- ENV PATCH --------
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
# --------------------------

# Runtime deps + fonts (RUNTIME MUST ALSO HAVE THEM)
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
    noto-fonts \
    noto-fonts-cjk \
    noto-fonts-emoji

# Rebuild font cache again
RUN fc-cache -f -v

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/index.js ./index.js
COPY --from=build /app/konva ./konva
COPY --from=build /app/utils ./utils

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 4000
CMD ["node", "index.js"]
