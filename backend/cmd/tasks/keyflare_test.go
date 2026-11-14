package main

import (
	"strings"
	"testing"
)

func TestParseSecrets(t *testing.T) {
	secrets, err := parseSecrets([]byte(`{"POSTGRES_PASSWORD": "a=b\nc", "EMPTY": ""}`))
	if err != nil {
		t.Fatalf("parseSecrets returned an error: %v", err)
	}
	if len(secrets) != 2 {
		t.Errorf("got %d secrets, want 2", len(secrets))
	}
	if secrets["POSTGRES_PASSWORD"] != "a=b\nc" {
		t.Errorf("POSTGRES_PASSWORD was not decoded intact")
	}
	if value, ok := secrets["EMPTY"]; !ok || value != "" {
		t.Errorf("EMPTY should be present with an empty value")
	}
}

func TestParseSecretsRejects(t *testing.T) {
	outputs := map[string]string{
		"empty output":     "",
		"plain text":       "No secrets found.",
		"array":            "[]",
		"null":             "null",
		"empty object":     "{}",
		"non-string value": `{"PORT": 8080}`,
	}
	for name, output := range outputs {
		t.Run(name, func(t *testing.T) {
			if _, err := parseSecrets([]byte(output)); err == nil {
				t.Errorf("parseSecrets(%q) returned no error", output)
			}
		})
	}
}

func TestParseSecretsErrorShowsNoticesButNeverObjects(t *testing.T) {
	_, err := parseSecrets([]byte("A new kfl version is available\n{\"TOKEN\": \"hunter2\"}"))
	if err == nil || !strings.Contains(err.Error(), "A new kfl version is available") {
		t.Errorf("a notice before the payload should be quoted, got %v", err)
	}

	_, err = parseSecrets([]byte(`{"TOKEN": "hunter2", "PORT": 8080}`))
	if err == nil {
		t.Fatal("a non-string value should be rejected")
	}
	if strings.Contains(err.Error(), "hunter2") || strings.Contains(err.Error(), "TOKEN") {
		t.Errorf("an object must never be quoted in the error, got %v", err)
	}

	_, err = parseSecrets([]byte(`{"TOKEN": "hunter2"`))
	if err == nil || strings.Contains(err.Error(), "hunter2") {
		t.Errorf("a truncated object must not be quoted either, got %v", err)
	}
}
