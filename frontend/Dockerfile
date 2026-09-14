# Use an official Node runtime as a parent image
FROM node:22-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install frontend dependencies
# npm ci installs exactly what package-lock.json records. npm install is free to
# resolve newer versions inside the ^ ranges, so two builds from the same commit
# could ship different frontend dependencies.
RUN npm ci

# Copy the rest of the frontend code
COPY . .

# Expose the port Vite runs on
EXPOSE 5173

# Note: We do not need a CMD here because docker-compose.yml 
# overrides it with 'npm run dev'