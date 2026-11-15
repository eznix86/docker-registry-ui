package helm

import (
	"testing"
)

const testReadme = "# x\n"

func TestExtractChartKeepsTheReadmeWhateverItsCase(t *testing.T) {
	for _, name := range []string{chartReadmeFile, "readme.md", "Readme.md"} {
		chart, err := extractChart(makeChartTarball(t, map[string]string{
			chartMetadataFile: testChartYAML,
			name:              "# podinfo\n",
		}, "podinfo"))
		if err != nil {
			t.Fatalf("%s: extractChart: %v", name, err)
		}
		if chart.Readme != "# podinfo\n" {
			t.Errorf("%s: Readme = %q", name, chart.Readme)
		}
	}
}

func TestExtractChartIgnoresReadmeFilesOutsideTheChartRoot(t *testing.T) {
	chart, err := extractChart(makeChartTarball(t, map[string]string{
		chartMetadataFile:        testChartYAML,
		"charts/redis/README.md": "subchart readme",
		"templates/README.md":    "not the chart readme",
		testDeploymentPath:       testDeploymentYAML,
	}, "podinfo"))
	if err != nil {
		t.Fatalf("extractChart: %v", err)
	}
	if chart.Readme != "" {
		t.Errorf("Readme = %q, want empty", chart.Readme)
	}
}

func TestChartListsReadmeValuesChartYamlThenSortedTemplatesWithSizes(t *testing.T) {
	chart, err := extractChart(makeChartTarball(t, map[string]string{
		chartMetadataFile:        testChartYAML,
		chartValuesFile:          testValuesYAML,
		chartReadmeFile:          testReadme,
		"templates/service.yaml": "kind: Service\n",
		testDeploymentPath:       testDeploymentYAML,
	}, "podinfo"))
	if err != nil {
		t.Fatalf("extractChart: %v", err)
	}

	want := []FileInfo{
		{Path: chartReadmeFile, Size: len(testReadme)},
		{Path: chartValuesFile, Size: len(testValuesYAML)},
		{Path: chartMetadataFile, Size: len(testChartYAML)},
		{Path: testDeploymentPath, Size: len(testDeploymentYAML)},
		{Path: "templates/service.yaml", Size: len("kind: Service\n")},
	}
	got := chart.Listing()
	if len(got) != len(want) {
		t.Fatalf("Listing() = %+v, want %+v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("Listing()[%d] = %+v, want %+v", i, got[i], want[i])
		}
	}
}

func TestChartListingLeavesOutFilesTheChartDoesNotHave(t *testing.T) {
	chart, err := extractChart(makeChartTarball(t, map[string]string{
		chartMetadataFile: testChartYAML,
	}, "podinfo"))
	if err != nil {
		t.Fatalf("extractChart: %v", err)
	}
	got := chart.Listing()
	if len(got) != 1 || got[0].Path != chartMetadataFile {
		t.Errorf("Listing() = %+v, want only %s", got, chartMetadataFile)
	}
}

func TestChartFileReturnsContentByListedPathOnly(t *testing.T) {
	chart, err := extractChart(makeChartTarball(t, map[string]string{
		chartMetadataFile:  testChartYAML,
		chartValuesFile:    testValuesYAML,
		chartReadmeFile:    testReadme,
		testDeploymentPath: testDeploymentYAML,
	}, "podinfo"))
	if err != nil {
		t.Fatalf("extractChart: %v", err)
	}

	for path, want := range map[string]string{
		chartReadmeFile:    testReadme,
		chartValuesFile:    testValuesYAML,
		chartMetadataFile:  testChartYAML,
		testDeploymentPath: testDeploymentYAML,
	} {
		got, ok := chart.File(path)
		if !ok || got != want {
			t.Errorf("File(%q) = %q, %v; want %q, true", path, got, ok, want)
		}
	}

	for _, path := range []string{"", "missing.yaml", "../Chart.yaml", "/etc/passwd", "templates/../Chart.yaml"} {
		if got, ok := chart.File(path); ok {
			t.Errorf("File(%q) = %q, true; want not found", path, got)
		}
	}
}
