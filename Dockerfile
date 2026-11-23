# answer-checker: the API and the playground in one image.
# No data is stored and no calls go out. Claim mode, which needs a model, is not in this image.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
COPY packages/action/package.json packages/action/
RUN npm ci --no-audit --no-fund
COPY packages packages
RUN npm run build --workspace @answer-checker/web && npm prune --omit=dev --no-audit --no-fund

FROM node:22-slim
ENV NODE_ENV=production PORT=8787 STATIC_DIR=/app/web
WORKDIR /app
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/packages/core packages/core
COPY --from=build /app/packages/api packages/api
COPY --from=build /app/packages/web/dist web
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://localhost:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "--import", "tsx", "packages/api/src/server.ts"]
