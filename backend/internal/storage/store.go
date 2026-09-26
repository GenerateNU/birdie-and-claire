package storage

import "context"

type PresignedUpload struct {
	URL     string
	Method  string
	Headers map[string]string
	Key     string
}

type ObjectInfo struct {
	ContentType string
	Size        int64
}

type ObjectStore interface {
	PresignPut(ctx context.Context, key, contentType string) (PresignedUpload, error)
	HeadObject(ctx context.Context, key string) (ObjectInfo, error)
	PublicURL(key string) string
	HeadBucket(ctx context.Context) error
}
