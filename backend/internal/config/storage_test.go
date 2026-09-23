package config

import (
	"strings"
	"testing"
)

func TestLoadStorage(t *testing.T) {
	tests := []struct {
		name       string
		envVars    map[string]string
		wantErr    bool
		wantErrMsg string
	}{
		{
			name: "valid config with endpoint set (floci/local)",
			envVars: map[string]string{
				"S3_BUCKET":             "birdie-and-claire-profile-pictures",
				"S3_REGION":             "us-east-1",
				"S3_ENDPOINT":           "http://localhost:4566",
				"AWS_ACCESS_KEY_ID":     "test",
				"AWS_SECRET_ACCESS_KEY": "test",
			},
			wantErr: false,
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
			wantErr: false,
		},
		{
			name: "missing bucket fails",
			envVars: map[string]string{
				"S3_BUCKET":             "",
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
				"S3_REGION":             "",
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
				"AWS_ACCESS_KEY_ID":     "",
				"AWS_SECRET_ACCESS_KEY": "test",
			},
			wantErr:    true,
			wantErrMsg: "AWS credentials missing",
		},
		{
			name: "missing secret key fails",
			envVars: map[string]string{
				"S3_BUCKET":             "birdie-and-claire-profile-pictures",
				"S3_REGION":             "us-east-1",
				"AWS_ACCESS_KEY_ID":     "test",
				"AWS_SECRET_ACCESS_KEY": "",
			},
			wantErr:    true,
			wantErrMsg: "AWS credentials missing",
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
			for _, key := range []string{"S3_BUCKET", "S3_REGION", "S3_ENDPOINT", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"} {
				t.Setenv(key, tt.envVars[key])
			}

			cfg, err := loadStorage()

			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				if tt.wantErrMsg != "" && !strings.Contains(err.Error(), tt.wantErrMsg) {
					t.Errorf("expected error containing %q, got %q", tt.wantErrMsg, err.Error())
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if cfg.Bucket != tt.envVars["S3_BUCKET"] {
				t.Errorf("Bucket = %q, want %q", cfg.Bucket, tt.envVars["S3_BUCKET"])
			}
			if cfg.Region != tt.envVars["S3_REGION"] {
				t.Errorf("Region = %q, want %q", cfg.Region, tt.envVars["S3_REGION"])
			}
			if cfg.Endpoint != tt.envVars["S3_ENDPOINT"] {
				t.Errorf("Endpoint = %q, want %q", cfg.Endpoint, tt.envVars["S3_ENDPOINT"])
			}
		})
	}
}