FROM node:14-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Expose port 8080
EXPOSE 8080

# Run webpack-dev-server for debugging (watches and serves)
CMD ["npx", "webpack-dev-server", "--mode=development", "--host", "0.0.0.0", "--port", "8080", "--inline", "--progress"]

