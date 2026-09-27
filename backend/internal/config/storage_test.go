package config

import (
	"strings"
	"testing"
)

type storageCase struct {
	name               string
	envVars            map[string]string
	wantErr            bool
	wantErrMsg         string
	wantMaxUploadBytes int64
}

var storageEnvKeys = []string{
	"S3_BUCKET", "S3_REGION", "S3_ENDPOINT", "S3_PUBLIC_ENDPOINT",
	"S3_MAX_UPLOAD_BYTES", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
}

func TestLoadStorage(t *testing.T) {
	tests := []storageCase{
		{
			name: "valid config with endpoint set (floci/local)",
			envVars: map[string]string{
				"S3_BUCKET":             "birdie-and-claire-profile-pictures",
				"S3_REGION":             "us-east-1",
				"S3_ENDPOINT":           "http://floci:4566",
				"S3_PUBLIC_ENDPOINT":    "http://localhost:4566",
				"AWS_ACCESS_KEY_ID":     "test",
				"AWS_SECRET_ACCESS_KEY": "test",
			},
			wantMaxUploadBytes: defaultMaxUploadBytes,
		},
		{
			name: "valid config with endpoint empty (real AWS)",
			envVars: map[string]string{
				"S3_BUCKET":             "birdie-and-claire-profile-pictures",
				"S3_REGION":             "us-east-1",
				"S3_ENDPOINT":           "",
				"AWS_ACCESS_KEY_ID":     "real-key",
				"AWS_SECRET_ACCESS_KEY": "real-secret",
			},
			wantMaxUploadBytes: defaultMaxUploadBytes,
		},
		{
			name: "missing bucket fails",
			envVars: map[string]string{
				"S3_REGION":             "us-east-1",
				"AWS_ACCESS_KEY_ID":     "test",
				"AWS_SECRET_ACCESS_KEY": "test",
			},
			wantErr:    true,
			wantErrMsg: "S3_BUCKET is required",
		},
		{
			name: "missing region fails",
			envVars: map[string]string{
				"S3_BUCKET":             "birdie-and-claire-profile-pictures",
				"AWS_ACCESS_KEY_ID":     "test",
				"AWS_SECRET_ACCESS_KEY": "test",
			},
			wantErr:    true,
			wantErrMsg: "S3_REGION is required",
		},
		{
			name: "missing access key fails",
			envVars: map[string]string{
				"S3_BUCKET":             "birdie-and-claire-profile-pictures",
				"S3_REGION":             "us-east-1",
				"AWS_SECRET_ACCESS_KEY": "test",
			},
			wantErr:    true,
			wantErrMsg: "AWS credentials missing",
		},
		{
			name: "missing secret key fails",
			envVars: map[string]string{
				"S3_BUCKET":         "birdie-and-claire-profile-pictures",
				"S3_REGION":         "us-east-1",
				"AWS_ACCESS_KEY_ID": "test",
			},
			wantErr:    true,
			wantErrMsg: "AWS credentials missing",
		},
		{
			name: "explicit max upload bytes is parsed",
			envVars: map[string]string{
				"S3_BUCKET":             "birdie-and-claire-profile-pictures",
				"S3_REGION":             "us-east-1",
				"S3_MAX_UPLOAD_BYTES":   "1048576",
				"AWS_ACCESS_KEY_ID":     "test",
				"AWS_SECRET_ACCESS_KEY": "test",
			},
			wantMaxUploadBytes: 1048576,
		},
		{
			name: "malformed max upload bytes fails",
			envVars: map[string]string{
				"S3_BUCKET":             "birdie-and-claire-profile-pictures",
				"S3_REGION":             "us-east-1",
				"S3_MAX_UPLOAD_BYTES":   "five megs",
				"AWS_ACCESS_KEY_ID":     "test",
				"AWS_SECRET_ACCESS_KEY": "test",
			},
			wantErr:    true,
			wantErrMsg: "S3_MAX_UPLOAD_BYTES must be a positive number",
		},
		{
			name: "endpoint without public endpoint fails",
			envVars: map[string]string{
				"S3_BUCKET":             "birdie-and-claire-profile-pictures",
				"S3_REGION":             "us-east-1",
				"S3_ENDPOINT":           "http://floci:4566",
				"AWS_ACCESS_KEY_ID":     "test",
				"AWS_SECRET_ACCESS_KEY": "test",
			},
			wantErr:    true,
			wantErrMsg: "must be set together",
		},
		{
			name: "public endpoint without endpoint fails",
			envVars: map[string]string{
				"S3_BUCKET":             "birdie-and-claire-profile-pictures",
				"S3_REGION":             "us-east-1",
				"S3_PUBLIC_ENDPOINT":    "http://localhost:4566",
				"AWS_ACCESS_KEY_ID":     "test",
				"AWS_SECRET_ACCESS_KEY": "test",
			},
			wantErr:    true,
			wantErrMsg: "must be set together",
		},
		{
			name:       "everything missing fails on bucket first",
			envVars:    map[string]string{},
			wantErr:    true,
			wantErrMsg: "S3_BUCKET is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for _, key := range storageEnvKeys {
				t.Setenv(key, tt.envVars[key])
			}

			cfg, err := loadStorage()

			if tt.wantErr {
				assertLoadError(t, err, tt.wantErrMsg)
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			assertStorageConfig(t, cfg, tt)
		})
	}
}

func assertLoadError(t *testing.T, err error, wantMsg string) {
	t.Helper()
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if wantMsg != "" && !strings.Contains(err.Error(), wantMsg) {
		t.Errorf("expected error containing %q, got %q", wantMsg, err.Error())
	}
}

func assertStorageConfig(t *testing.T, cfg StorageConfig, tt storageCase) {
	t.Helper()
	if cfg.Bucket != tt.envVars["S3_BUCKET"] {
		t.Errorf("Bucket = %q, want %q", cfg.Bucket, tt.envVars["S3_BUCKET"])
	}
	if cfg.Region != tt.envVars["S3_REGION"] {
		t.Errorf("Region = %q, want %q", cfg.Region, tt.envVars["S3_REGION"])
	}
	if cfg.Endpoint != tt.envVars["S3_ENDPOINT"] {
		t.Errorf("Endpoint = %q, want %q", cfg.Endpoint, tt.envVars["S3_ENDPOINT"])
	}
	if cfg.PublicEndpoint != tt.envVars["S3_PUBLIC_ENDPOINT"] {
		t.Errorf("PublicEndpoint = %q, want %q", cfg.PublicEndpoint, tt.envVars["S3_PUBLIC_ENDPOINT"])
	}
	if cfg.MaxUploadBytes != tt.wantMaxUploadBytes {
		t.Errorf("MaxUploadBytes = %d, want %d", cfg.MaxUploadBytes, tt.wantMaxUploadBytes)
	}
}
