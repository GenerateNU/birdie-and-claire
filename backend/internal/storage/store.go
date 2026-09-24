package storage

import "context"
type PresignedUpload struct {
	URL     string            `json:"url"`
	Method  string            `json:"method"`
	Headers map[string]string `json:"headers"`
	Key     string            `json:"key"`
}

type ObjectInfo struct {
	ContentType string
	Size        int64
}

type Store interface {
	PresignPut(ctx context.Context, key, contentType string) (PresignedUpload, error)
	HeadObject(ctx context.Context, key string) (ObjectInfo, error)
	URLFor(key string) string
	HeadBucket(ctx context.Context) error
}
