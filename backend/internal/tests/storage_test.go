package config

import "testing"

func TestLoadStorage(t *testing.T) {
	tests := []struct {
		name        string
		envVars     map[string]string
		wantErr     bool
		wantErrMsg  string
	}{
		{
			name: "valid config with endpoint set (floci/local)",
			envVars: map[string]string{
				"S3_BUCKET":             "birdie-and-claire-profile-pictures",
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
				"AWS_ACCESS_KEY_ID":     "test",
				"AWS_SECRET_ACCESS_KEY": "test",
			},
			wantErr:    true,
			wantErrMsg: "S3_BUCKET is required",
		},
		{
			name: "missing access key fails",
			envVars: map[string]string{
				"S3_BUCKET":             "birdie-and-claire-profile-pictures",
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
			for _, key := range []string{"S3_BUCKET", "S3_ENDPOINT", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"} {
				t.Setenv(key, tt.envVars[key])
			}

			cfg, err := loadStorage()

			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				if tt.wantErrMsg != "" && err.Error() != tt.wantErrMsg {
					// allow substring match since some messages may wrap
					if !contains(err.Error(), tt.wantErrMsg) {
						t.Errorf("expected error containing %q, got %q", tt.wantErrMsg, err.Error())
					}
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if cfg.Bucket != tt.envVars["S3_BUCKET"] {
				t.Errorf("Bucket = %q, want %q", cfg.Bucket, tt.envVars["S3_BUCKET"])
			}
			if cfg.Endpoint != tt.envVars["S3_ENDPOINT"] {
				t.Errorf("Endpoint = %q, want %q", cfg.Endpoint, tt.envVars["S3_ENDPOINT"])
			}
		})
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		func() bool {
			for i := 0; i+len(substr) <= len(s); i++ {
				if s[i:i+len(substr)] == substr {
					return true
				}
			}
			return false
		}())
}