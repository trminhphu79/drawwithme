# Runs the PREBUILT API (backend/dist is committed to git). No TS compile here —
# we only install runtime deps + generate the Prisma client, then run dist.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

# OpenSSL is required by Prisma's engines.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies (no build step). Prisma CLI (a devDependency) is needed
# for `prisma generate` / `db push`, so install the full set.
COPY package*.json ./
RUN npm ci

# Generate the Prisma client against the schema.
COPY prisma ./prisma
RUN npx prisma generate

# Copy the committed, prebuilt application code.
COPY dist ./dist

EXPOSE 3000

# Sync schema (dev-friendly) then start the prebuilt server.
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node dist/main.js"]
