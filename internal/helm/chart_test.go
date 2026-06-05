package helm

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"testing"
)

const (
	testChartYAML      = "name: foo\nversion: 0.1.0\n"
	testValuesYAML     = "replicas: 3\n"
	testDeploymentPath = "templates/deployment.yaml"
	testDeploymentYAML = "kind: Deployment\n"
)

func makeChartTarball(t *testing.T, files map[string]string, topDir string) []byte {
	t.Helper()
	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gz)
	for name, body := range files {
		full := name
		if topDir != "" {
			full = topDir + "/" + name
		}
		hdr := &tar.Header{
			Name: full,
			Mode: 0o644,
			Size: int64(len(body)),
		}
		if err := tw.WriteHeader(hdr); err != nil {
			t.Fatalf("write header: %v", err)
		}
		if _, err := tw.Write([]byte(body)); err != nil {
			t.Fatalf("write body: %v", err)
		}
	}
	if err := tw.Close(); err != nil {
		t.Fatalf("close tar: %v", err)
	}
	if err := gz.Close(); err != nil {
		t.Fatalf("close gzip: %v", err)
	}
	return buf.Bytes()
}

func TestExtractChart(t *testing.T) {
	files := map[string]string{
		chartMetadataFile:        testChartYAML,
		chartValuesFile:          testValuesYAML,
		testDeploymentPath:       testDeploymentYAML,
		"templates/_helpers.tpl": "{{ define \"x\" }}",
		"README.md":              "ignore me",
	}
	chart, err := extractChart(makeChartTarball(t, files, ""))
	if err != nil {
		t.Fatalf("extractChart: %v", err)
	}

	if chart.Values != testValuesYAML {
		t.Errorf("Values = %q, want %q", chart.Values, testValuesYAML)
	}
	if chart.ChartYAML != testChartYAML {
		t.Errorf("ChartYAML = %q", chart.ChartYAML)
	}
	if len(chart.Files) != 2 {
		t.Fatalf("expected 2 template files, got %d: %+v", len(chart.Files), chart.Files)
	}
	wantPaths := map[string]bool{
		testDeploymentPath:       false,
		"templates/_helpers.tpl": false,
	}
	for _, f := range chart.Files {
		if _, ok := wantPaths[f.Path]; !ok {
			t.Errorf("unexpected template file: %s", f.Path)
		}
		wantPaths[f.Path] = true
	}
	for p, found := range wantPaths {
		if !found {
			t.Errorf("missing template file: %s", p)
		}
	}
}

func TestExtractChartStripsTopLevelDir(t *testing.T) {
	files := map[string]string{
		chartMetadataFile:  testChartYAML,
		chartValuesFile:    testValuesYAML,
		testDeploymentPath: testDeploymentYAML,
	}
	chart, err := extractChart(makeChartTarball(t, files, "foo"))
	if err != nil {
		t.Fatalf("extractChart: %v", err)
	}
	if chart.Values != testValuesYAML {
		t.Errorf("Values = %q, want %q", chart.Values, testValuesYAML)
	}
	if chart.ChartYAML != testChartYAML {
		t.Errorf("ChartYAML = %q", chart.ChartYAML)
	}
	if len(chart.Files) != 1 {
		t.Fatalf("expected 1 template file, got %d: %+v", len(chart.Files), chart.Files)
	}
	if chart.Files[0].Path != testDeploymentPath {
		t.Errorf("File.Path = %q, want %q", chart.Files[0].Path, testDeploymentPath)
	}
}

func TestExtractChartSkipsPathTraversal(t *testing.T) {
	files := map[string]string{
		"../escape.txt": "bad",
		"/abs.txt":      "bad",
	}
	chart, err := extractChart(makeChartTarball(t, files, ""))
	if err != nil {
		t.Fatalf("extractChart: %v", err)
	}
	if chart.Values != "" || chart.ChartYAML != "" {
		t.Errorf("unexpected values or chart yaml from traversal: %+v", chart)
	}
	if len(chart.Files) != 0 {
		t.Errorf("expected no files, got %+v", chart.Files)
	}
}

func TestDetectChartPrefix(t *testing.T) {
	type testEntry struct {
		name string
		body []byte
	}
	cases := []struct {
		name    string
		entries []testEntry
		want    string
	}{
		{"empty", nil, ""},
		{"no prefix", []testEntry{{"Chart.yaml", nil}, {"values.yaml", nil}}, ""},
		{"common prefix", []testEntry{{"a/b.yaml", nil}, {"a/c.yaml", nil}}, "a/"},
		{"common prefix", []testEntry{{"foo/Chart.yaml", nil}, {"foo/values.yaml", nil}, {"foo/templates/x.yaml", nil}}, "foo/"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			names := make([]string, len(tc.entries))
			for i, e := range tc.entries {
				names[i] = e.name
			}
			got := detectChartPrefix(names)
			if got != tc.want {
				t.Errorf("detectChartPrefix = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestReaderLRU(t *testing.T) {
	r := NewReader(2)
	first := &Chart{Values: "first"}
	second := &Chart{Values: "second"}
	third := &Chart{Values: "third"}

	r.put("a", first)
	r.put("b", second)
	r.put("c", third) // evicts "a"

	if got := r.get("a"); got != nil {
		t.Errorf("expected a to be evicted")
	}
	if got := r.get("b"); got != second {
		t.Errorf("b cache miss")
	}
	if got := r.get("c"); got != third {
		t.Errorf("c cache miss")
	}
}
