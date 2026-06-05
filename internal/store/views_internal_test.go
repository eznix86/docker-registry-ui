package store

import (
	"testing"
	"time"
)

func TestParseTime(t *testing.T) {
	t.Helper()

	tests := []struct {
		name  string
		value string
	}{
		{name: "sql with nanos", value: "2024-01-15 10:30:45.123456789+00:00"},
		{name: "sql without nanos", value: "2024-01-15 10:30:45+00:00"},
		{name: "rfc3339", value: time.Date(2024, 1, 15, 10, 30, 45, 123456789, time.UTC).Format(time.RFC3339Nano)},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			parsed, err := parseTime(test.value)
			if err != nil {
				t.Fatalf("parseTime(%q): %v", test.value, err)
			}

			if parsed.IsZero() {
				t.Fatalf("expected non-zero time for %q", test.value)
			}
		})
	}
}

func TestParseTimeInvalid(t *testing.T) {
	t.Helper()

	if _, err := parseTime("not-a-time"); err == nil {
		t.Fatal("expected parseTime to fail for invalid input")
	}
}
