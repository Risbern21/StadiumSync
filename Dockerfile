# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all project files (including .env which Vite needs for build-time variables)
COPY . .

# Build the app for production
RUN npm run build

# Stage 2: Serve the app using Nginx
FROM nginx:alpine

# Copy the custom Nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built output from Stage 1 into Nginx's html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Cloud Run expects the container to listen on $PORT (default 8080)
# Our nginx.conf natively listens on 8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
