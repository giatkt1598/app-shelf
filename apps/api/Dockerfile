FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY apps/api apps/api
RUN npm run build -w @app-shelf/api

FROM node:24-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci --omit=dev --workspace @app-shelf/api

COPY --from=build /app/apps/api/dist apps/api/dist

EXPOSE 8787
CMD ["node", "apps/api/dist/index.js"]
