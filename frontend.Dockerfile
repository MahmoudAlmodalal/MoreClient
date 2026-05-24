
# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app/frontend

# Copy package.json and pnpm-lock.yaml to install dependencies
COPY MoreClient/package.json MoreClient/pnpm-lock.yaml ./MoreClient/
COPY pnpm-workspace.yaml .

# Install pnpm globally and then install dependencies
RUN npm install -g pnpm
RUN pnpm install --dir MoreClient

# Copy the rest of the frontend application code
COPY MoreClient/ ./MoreClient/

# Build the Next.js application
RUN pnpm --dir MoreClient run build

# Expose the port the app runs on
EXPOSE 5001

# Start the Next.js application
CMD ["pnpm", "--dir", "MoreClient", "run", "start"]
