package storage

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"example_project/internal/config"
	"example_project/internal/errs"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/smithy-go"
)

const presignExpiry = 15 * time.Minute

type s3Store struct {
	client          *s3.Client
	presigner       *s3.PresignClient
	bucket          string
	publicBucketURL string
}

func New(ctx context.Context, cfg config.StorageConfig) (ObjectStore, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(cfg.Region))
	if err != nil {
		return nil, fmt.Errorf("load AWS config: %w", err)
	}

	publicClient := newS3Client(awsCfg, cfg.PublicEndpoint)

	return &s3Store{
		client:          newS3Client(awsCfg, cfg.Endpoint),
		presigner:       s3.NewPresignClient(publicClient, s3.WithPresignExpires(presignExpiry)),
		bucket:          cfg.Bucket,
		publicBucketURL: publicBucketURL(cfg),
	}, nil
}

// publicBucketURL is the browser-facing base URL for the bucket: the Floci host
func publicBucketURL(cfg config.StorageConfig) string {
	if cfg.PublicEndpoint != "" {
		return fmt.Sprintf("%s/%s", cfg.PublicEndpoint, cfg.Bucket)
	}
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com", cfg.Bucket, cfg.Region)
}

func newS3Client(awsCfg aws.Config, endpoint string) *s3.Client {
	return s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.RequestChecksumCalculation = aws.RequestChecksumCalculationWhenRequired
		if endpoint != "" {
			o.BaseEndpoint = aws.String(endpoint)
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
		if isNotFound(err) {
			return ObjectInfo{}, errs.ErrNotFound
		}
		return ObjectInfo{}, fmt.Errorf("head object %s: %w", key, err)
	}

	return ObjectInfo{
		ContentType: aws.ToString(out.ContentType),
		Size:        aws.ToInt64(out.ContentLength),
	}, nil
}

func isNotFound(err error) bool {
	var apiErr smithy.APIError
	if !errors.As(err, &apiErr) {
		return false
	}
	code := apiErr.ErrorCode()
	return code == "NotFound" || code == "NoSuchKey" || code == "404"
}

func (s *s3Store) PublicURL(key string) string {
	return fmt.Sprintf("%s/%s", s.publicBucketURL, key)
}

func (s *s3Store) HeadBucket(ctx context.Context) error {
	if _, err := s.client.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(s.bucket)}); err != nil {
		return fmt.Errorf("head bucket %s: %w", s.bucket, err)
	}
	return nil
}
