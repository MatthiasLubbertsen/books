FROM node:22-alpine

# Prisma's query engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV PORT=8312
VOLUME ["/app/data"]
EXPOSE 8312

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
