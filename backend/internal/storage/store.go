// Package storage owns object storage (S3 / Floci). Store is the seam the rest of
// the app codes against, so real and stub implementations are interchangeable.
package storage

import "context"

// PresignedUpload is a short-lived upload target: the client PUTs the file to URL
// using Method, replaying every header in Headers.
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

type Store interface {
	// PresignPut returns a short-lived URL the client uploads to directly.
	// contentType is bound into the signature, so the client must send it.
	PresignPut(ctx context.Context, key, contentType string) (PresignedUpload, error)
	// HeadObject reports a stored object's type and size, erroring if it is absent.
	HeadObject(ctx context.Context, key string) (ObjectInfo, error)
	// URLFor builds the public URL serving the object at key.
	URLFor(key string) string
	// HeadBucket verifies the bucket is reachable; used as a startup check.
	HeadBucket(ctx context.Context) error
}
