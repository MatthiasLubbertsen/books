FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server.js ./
COPY public ./public

ENV PORT=8312
ENV DATA_DIR=/app/data
VOLUME ["/app/data"]

EXPOSE 8312

CMD ["node", "server.js"]
