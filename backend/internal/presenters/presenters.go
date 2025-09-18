package presenters

type HealthView struct {
	Status string `json:"status"`
	Time   string `json:"time"`
}

type SourceView struct {
	Key    string `json:"key"`
	Host   string `json:"host"`
	Status int    `json:"status"`
}

type RepositoryView struct {
	ID                 uint     `json:"id"`
	Name               string   `json:"name"`
	Namespace          *string  `json:"namespace"`
	FullName           string   `json:"fullName"`
	Source             string   `json:"source"`
	TagCount           int      `json:"tagCount"`
	TotalSize          int64    `json:"totalSize"`
	TotalSizeFormatted string   `json:"totalSizeFormatted"`
	TagsList           []string `json:"tagsList"`
	Architectures      []string `json:"architectures"`
	RegistryHost       string   `json:"registryHost"`
}

type ProgressUpdateView struct {
	Stage     string `json:"stage"`
	Progress  int    `json:"progress"`
	Message   string `json:"message"`
	Action    string `json:"action"`
}