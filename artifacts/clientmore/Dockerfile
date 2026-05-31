FROM node:18-alpine

WORKDIR /app

# Copy pnpm-workspace.yaml, root package.json, and pnpm-lock.yaml
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy lib/* for workspace dependencies
COPY lib ./lib

# Copy the frontend application source
COPY artifacts/clientmore ./artifacts/clientmore

# Install pnpm and dependencies for the entire workspace
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build the frontend application
RUN pnpm --filter clientmore build

EXPOSE 3000

CMD ["pnpm", "--filter", "clientmore", "run", "serve", "--host", "0.0.0.0", "--port", "3000"]
