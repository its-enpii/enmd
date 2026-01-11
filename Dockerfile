# Use Node.js LTS (Alpine for smaller size)
FROM node:20-alpine

# Install system dependencies required for yt-dlp and ffmpeg
# python3 is needed for yt-dlp
# ffmpeg is needed for media merging
RUN apk add --no-cache python3 py3-pip ffmpeg

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install Node.js dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the Nuxt application
RUN npm run build

# Expose the port Nuxt runs on (default 3000)
EXPOSE 3000

# Set environment variables
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0

# Start the application
CMD ["node", ".output/server/index.mjs"]
