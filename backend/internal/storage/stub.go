package storage

import (
	"context"
	"fmt"

	"example_project/internal/config"
)

// stubStore is a no-network Store used only for offline OpenAPI generation
// (server.Spec), so `api:generate` needs no S3 credentials or connection. The
// running server uses the real S3 store, never this.
type stubStore struct {
	endpoint string
	bucket   string
}

// NewStub mirrors the real constructor's signature so the Spec wiring matches New.
func NewStub(cfg config.StorageConfig) Store {
	return &stubStore{endpoint: cfg.Endpoint, bucket: cfg.Bucket}
}

func (s *stubStore) PresignPut(_ context.Context, key, contentType string) (PresignedUpload, error) {
	return PresignedUpload{
		URL:     s.URLFor(key) + "?stub-presigned=true",
		Method:  "PUT",
		Headers: map[string]string{"Content-Type": contentType},
		Key:     key,
	}, nil
}

func (s *stubStore) HeadObject(_ context.Context, _ string) (ObjectInfo, error) {
	return ObjectInfo{ContentType: "image/png", Size: 1024}, nil
}

func (s *stubStore) URLFor(key string) string {
	return fmt.Sprintf("%s/%s/%s", s.endpoint, s.bucket, key)
}

func (s *stubStore) HeadBucket(_ context.Context) error { return nil }
