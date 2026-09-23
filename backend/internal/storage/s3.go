package storage

import (
	"context"
	"fmt"
	"strings"
	"time"

	"example_project/internal/config"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

const presignExpiry = 15 * time.Minute

type s3Store struct {
	client         *s3.Client
	presigner      *s3.PresignClient
	publicEndpoint string
	region         string
	bucket         string
}

// New builds an S3-backed Store. When cfg.Endpoint is set (Floci locally) the
// client targets it instead of AWS. Credentials come from the AWS_* environment.
func New(ctx context.Context, cfg config.StorageConfig) (Store, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(cfg.Region))
	if err != nil {
		return nil, fmt.Errorf("load AWS config: %w", err)
	}

	// The host is part of the signature, so presigned URLs must be signed for the
	// address the browser uses, not the one this process reaches storage on.
	// Presigning makes no network call, so the public client never dials out.
	publicClient := newS3Client(awsCfg, cfg.PublicEndpoint)

	return &s3Store{
		client:         newS3Client(awsCfg, cfg.Endpoint),
		presigner:      s3.NewPresignClient(publicClient, s3.WithPresignExpires(presignExpiry)),
		publicEndpoint: cfg.PublicEndpoint,
		region:         cfg.Region,
		bucket:         cfg.Bucket,
	}, nil
}

func newS3Client(awsCfg aws.Config, endpoint string) *s3.Client {
	return s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		// The SDK's default checksum is computed over the empty body at presign
		// time and signed into the URL, so the client's real upload would fail.
		o.RequestChecksumCalculation = aws.RequestChecksumCalculationWhenRequired
		if endpoint != "" {
			o.BaseEndpoint = aws.String(endpoint)
			// Floci serves buckets at endpoint/bucket; bucket.localhost does not resolve.
			o.UsePathStyle = true
		}
	})
}

func (s *s3Store) PresignPut(ctx context.Context, key, contentType string) (PresignedUpload, error) {
	request, err := s.presigner.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return PresignedUpload{}, fmt.Errorf("presign put %s: %w", key, err)
	}

	headers := make(map[string]string, len(request.SignedHeader))
	for name, values := range request.SignedHeader {
		// Browsers forbid setting Host and send it themselves.
		if strings.EqualFold(name, "Host") {
			continue
		}
		headers[name] = strings.Join(values, ",")
	}

	return PresignedUpload{
		URL:     request.URL,
		Method:  request.Method,
		Headers: headers,
		Key:     key,
	}, nil
}

func (s *s3Store) HeadObject(ctx context.Context, key string) (ObjectInfo, error) {
	out, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return ObjectInfo{}, fmt.Errorf("head object %s: %w", key, err)
	}

	return ObjectInfo{
		ContentType: aws.ToString(out.ContentType),
		Size:        aws.ToInt64(out.ContentLength),
	}, nil
}

func (s *s3Store) URLFor(key string) string {
	if s.publicEndpoint != "" {
		return fmt.Sprintf("%s/%s/%s", s.publicEndpoint, s.bucket, key)
	}
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.bucket, s.region, key)
}

func (s *s3Store) HeadBucket(ctx context.Context) error {
	if _, err := s.client.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(s.bucket)}); err != nil {
		return fmt.Errorf("head bucket %s: %w", s.bucket, err)
	}
	return nil
}
