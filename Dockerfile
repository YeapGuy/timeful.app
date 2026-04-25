# syntax=docker/dockerfile:1.7

FROM --platform=$BUILDPLATFORM node:20-alpine AS frontend-builder
WORKDIR /src/frontend

COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./

ARG VUE_APP_POSTHOG_API_KEY=""
ARG VUE_APP_GOOGLE_CLIENT_ID=""
ARG VUE_APP_MICROSOFT_CLIENT_ID=""

ENV VUE_APP_POSTHOG_API_KEY=${VUE_APP_POSTHOG_API_KEY}
ENV VUE_APP_GOOGLE_CLIENT_ID=${VUE_APP_GOOGLE_CLIENT_ID}
ENV VUE_APP_MICROSOFT_CLIENT_ID=${VUE_APP_MICROSOFT_CLIENT_ID}

RUN npm run build

FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS server-builder
WORKDIR /src/server

RUN apk add --no-cache git

COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server/ ./

ARG TARGETOS=linux
ARG TARGETARCH=amd64
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -trimpath -ldflags="-s -w" -buildvcs=false -o /out/timeful-server .

FROM alpine:3.23 AS runtime
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata wget \
  && addgroup -S app \
  && adduser -S -G app app \
  && mkdir -p /app/frontend/dist /app/logs \
  && chown -R app:app /app

COPY --from=server-builder /out/timeful-server /app/server
COPY --from=frontend-builder /src/frontend/dist /app/frontend/dist

USER app

ENV GIN_MODE=release
ENV FRONTEND_DIST=/app/frontend/dist
ENV LOG_FILE_PATH=/app/logs/timeful.log

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3002/api/health || exit 1

ENTRYPOINT ["/app/server"]
CMD ["-release=true"]
