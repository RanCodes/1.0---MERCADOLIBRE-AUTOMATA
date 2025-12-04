# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --frozen-lockfile=false

# Copy source and build
COPY . .

# Allow passing the API key at build time for Vite to embed if needed
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=${GEMINI_API_KEY}
ENV API_KEY=${GEMINI_API_KEY}

RUN npm run build

# Runtime stage
FROM nginx:1.27-alpine AS runtime

# Custom Nginx config to serve on port 8081
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8081
CMD ["nginx", "-g", "daemon off;"]
