# Stage 1: Build static assets
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm ci

COPY . ./
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/40-write-runtime-config.sh /docker-entrypoint.d/40-write-runtime-config.sh

RUN chmod +x /docker-entrypoint.d/40-write-runtime-config.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
