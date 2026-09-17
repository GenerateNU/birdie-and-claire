FROM golang:1.27.1-bookworm

WORKDIR /app

RUN go install github.com/air-verse/air@v1.67.4

COPY go.mod go.sum ./
RUN go mod download

EXPOSE 8080

CMD ["air", "-c", ".air.toml"]
