FROM node:20-alpine

RUN apk add --no-cache git

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY api/ ./api/
COPY public/ ./public/

EXPOSE 3000

CMD ["node", "api/server.js"]
