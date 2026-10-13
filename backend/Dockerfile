# Production image for the droplet. dev.Dockerfile is the hot-reloading one
# Compose uses locally.
FROM golang:1.27.1-bookworm AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
# The migrate binary ships alongside the server so a deploy can apply the
# embedded migrations from the same image it is about to run.
RUN CGO_ENABLED=0 go build -o /out/server ./cmd \
 && CGO_ENABLED=0 go build -o /out/migrate ./cmd/migrate

# distroless/static carries CA certificates, which Supabase, S3, and Modal
# all need, and nothing else.
FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /out/server /out/migrate /

EXPOSE 8080

ENTRYPOINT ["/server"]
