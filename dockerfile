FROM node:18-bullseye

WORKDIR /app
ENV NODE_ENV=production
ENV npm_config_build_from_source=true

# Native dependencies for canvas + sharp
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libvips-dev \
    libglib2.0-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency manifests ONLY
COPY package.json package-lock.json ./

# Install Node dependencies (canvas + sharp will build from source)
RUN npm ci --omit=dev

# Copy app source
COPY . .

EXPOSE 4000
CMD ["node", "index.js"]
