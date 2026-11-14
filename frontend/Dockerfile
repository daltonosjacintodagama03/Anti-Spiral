FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./

RUN npm install --no-audit --no-fund

COPY tsconfig.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src

RUN npm run build


FROM alpine:3.22 AS runtime

RUN apk add --no-cache nginx

COPY conf/nginx.conf /etc/nginx/nginx.conf
COPY tools/frontend.sh /usr/local/bin/frontend.sh

COPY --from=builder /app/dist /var/www/html

RUN chmod 0755 /usr/local/bin/frontend.sh

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/frontend.sh"]
