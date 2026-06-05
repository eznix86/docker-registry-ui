package planning

type JobInput struct {
	RegistryName string
	Namespace    string
	RepoName     string
	TagName      string
}

type Job struct {
	JobInput
	RegistryID     uint
	RegistryHost   string
	RepositoryID   uint
	PriorityScore  float64
	ExistingDigest string
}

func (j Job) RepoPath() string {
	if j.Namespace == "" {
		return j.RepoName
	}

	return j.Namespace + "/" + j.RepoName
}
