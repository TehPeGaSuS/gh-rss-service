FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY config.example.json ./config.example.json

VOLUME ["/data"]
ENV CONFIG_PATH=/data/config.json
ENV DB_PATH=/data/gh-rss.db
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/server.js"]
