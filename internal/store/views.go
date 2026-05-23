package store

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

func (s *Store) GetTagsForRepository(ctx context.Context, repositoryID uint, filter TagFilter, pagination ScrollPagination) (ScrollResult, error) {
	var countArgs []any
	countQuery := "SELECT COUNT(*) FROM tags_view WHERE repository_id = ?"
	countArgs = append(countArgs, repositoryID)

	if filter.Name != "" {
		countQuery += " AND name LIKE ?"
		countArgs = append(countArgs, "%"+filter.Name+"%")
	}

	r := s.queryRow(ctx, countQuery, countArgs...)
	var totalCount int64
	if err := r.Scan(&totalCount); err != nil {
		return ScrollResult{}, fmt.Errorf("count tags: %w", err)
	}

	totalPages := int((totalCount + int64(pagination.PageSize) - 1) / int64(pagination.PageSize))
	var nextPage, prevPage *int
	if pagination.Page < totalPages {
		np := pagination.Page + 1
		nextPage = &np
	}
	if pagination.Page > 1 {
		pp := pagination.Page - 1
		prevPage = &pp
	}

	orderClause := "created_at DESC"
	switch filter.SortBy {
	case "size-asc":
		orderClause = "total_size ASC"
	case "size-desc":
		orderClause = "total_size DESC"
	case "oldest":
		orderClause = "created_at ASC"
	case "name-asc":
		orderClause = "name ASC"
	case "name-desc":
		orderClause = "name DESC"
	}

	offset := (pagination.Page - 1) * pagination.PageSize

	rows, err := s.queryTagData(ctx, repositoryID, filter.Name, orderClause, pagination.PageSize, offset)
	if err != nil {
		return ScrollResult{}, err
	}

	tagViews := s.buildTagViews(rows)
	s.populateAliases(ctx, repositoryID, tagViews)

	return ScrollResult{
		Tags:         tagViews,
		TotalCount:   int(totalCount),
		CurrentPage:  pagination.Page,
		NextPage:     nextPage,
		PreviousPage: prevPage,
	}, nil
}

type tagDataRow struct {
	tagID         uint
	tagName       string
	tagDigest     string
	tagKind       string
	tagCreatedAt  sqlStr
	mDigest       sqlStr
	mOS           sqlStr
	mArch         sqlStr
	mVariant      sqlStr
	configSize    *int64
	configCreated sqlStr
	isStub        bool
	chartName     sqlStr
	chartVersion  sqlStr
	chartDesc     sqlStr
}

func (s *Store) queryTagData(ctx context.Context, repositoryID uint, nameFilter, order string, limit, offset int) ([]tagDataRow, error) {
	var nameCond string
	var args []any
	args = append(args, repositoryID)

	if nameFilter != "" {
		nameCond = "AND name LIKE ?"
		args = append(args, "%"+nameFilter+"%")
	}

	args = append(args, limit, offset)

	query := fmt.Sprintf(`
		WITH filtered_tags AS (
			SELECT id, name, digest, kind, created_at, chart_name, chart_version, chart_desc
			FROM tags_view
			WHERE repository_id = ? %s
			ORDER BY %s
			LIMIT ? OFFSET ?
		)
		SELECT
			ft.id, ft.name, ft.digest, ft.kind, ft.created_at,
			m.digest, m.os, m.architecture, m.variant,
			m.size_bytes, m.created,
			ft.chart_name, ft.chart_version, ft.chart_desc
		FROM filtered_tags ft
		LEFT JOIN manifests m ON m.digest = ft.digest AND ft.kind IN ('image', 'helm')
		ORDER BY ft.id`, nameCond, order)

	rows, err := s.query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query tag data: %w", err)
	}
	defer rows.Close()

	var out []tagDataRow
	for rows.Next() {
		var r tagDataRow
		if err := rows.Scan(&r.tagID, &r.tagName, &r.tagDigest, &r.tagKind, &r.tagCreatedAt,
			&r.mDigest, &r.mOS, &r.mArch, &r.mVariant,
			&r.configSize, &r.configCreated, &r.chartName, &r.chartVersion, &r.chartDesc); err != nil {
			return nil, fmt.Errorf("scan tag row: %w", err)
		}
		out = append(out, r)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}

	out = s.appendIndexChildren(ctx, out)

	return out, nil
}

func (s *Store) appendIndexChildren(ctx context.Context, rows []tagDataRow) []tagDataRow {
	var indexIDs []uint
	indexRows := make(map[uint]int)
	for i, row := range rows {
		if row.mDigest.valid {
			continue
		}
		indexIDs = append(indexIDs, row.tagID)
		indexRows[row.tagID] = i
	}
	if len(indexIDs) == 0 {
		return rows
	}

	phs := make([]string, len(indexIDs))
	args := make([]any, len(indexIDs))
	for i, id := range indexIDs {
		phs[i] = "?"
		args[i] = id
	}

	kindRows, err := s.query(ctx,
		fmt.Sprintf("SELECT id, kind, digest, last_sync_at, priority FROM tags WHERE id IN (%s)", strings.Join(phs, ",")),
		args...)
	if err != nil {
		return rows
	}
	defer kindRows.Close()

	var indexDigests []string
	indexMeta := make(map[uint]tagMeta)
	for kindRows.Next() {
		var id uint
		var kind, digest string
		var lastSync sqlStr
		var priority sql.NullFloat64
		if err := kindRows.Scan(&id, &kind, &digest, &lastSync, &priority); err != nil {
			continue
		}
		if kind == "index" {
			indexDigests = append(indexDigests, digest)
			indexMeta[id] = tagMeta{digest: digest, lastSync: lastSync, priority: priority}
		}
	}
	kindRows.Close()

	if len(indexDigests) == 0 {
		return rows
	}

	dphs := make([]string, len(indexDigests))
	dargs := make([]any, len(indexDigests))
	for i, d := range indexDigests {
		dphs[i] = "?"
		dargs[i] = d
	}

	childRows, err := s.query(ctx,
		fmt.Sprintf(`SELECT mp.index_digest, mp.platform_digest, mp.os, mp.architecture, mp.variant, mp.size_bytes,
			m.created, CASE WHEN m.raw_json = '' THEN 1 ELSE 0 END
		 FROM manifest_platforms mp
		 LEFT JOIN manifests m ON m.digest = mp.platform_digest
		 WHERE mp.index_digest IN (%s) ORDER BY mp.position`, strings.Join(dphs, ",")),
		dargs...)
	if err != nil {
		return rows
	}
	defer childRows.Close()

	type childRow struct {
		indexDigest  string
		childDigest  sqlStr
		os           sqlStr
		arch         sqlStr
		variant      sqlStr
		size         int64
		created      sqlStr
		isStub       int64
	}
	childrenByIndex := make(map[string][]childRow)
	for childRows.Next() {
		var cr childRow
		if err := childRows.Scan(&cr.indexDigest, &cr.childDigest, &cr.os, &cr.arch, &cr.variant, &cr.size, &cr.created, &cr.isStub); err != nil {
			continue
		}
		childrenByIndex[cr.indexDigest] = append(childrenByIndex[cr.indexDigest], cr)
	}
	childRows.Close()

	for tagID, rowIdx := range indexRows {
		meta, ok := indexMeta[tagID]
		if !ok {
			continue
		}
		children, ok := childrenByIndex[meta.digest]
		if !ok {
			continue
		}
		for _, cr := range children {
			childRow := tagDataRow{
				tagID:         tagID,
				tagName:       rows[rowIdx].tagName,
				tagDigest:     rows[rowIdx].tagDigest,
				tagCreatedAt:  rows[rowIdx].tagCreatedAt,
				mDigest:       cr.childDigest,
				mOS:           cr.os,
				mArch:         cr.arch,
				mVariant:      cr.variant,
				configCreated: cr.created,
				isStub:        cr.isStub == 1,
			}
			childRow.configSize = &cr.size
			rows = append(rows, childRow)
		}
		rows[rowIdx].mDigest = sqlStr{valid: false}
	}

	return rows
}

type tagMeta struct {
	digest   string
	lastSync sqlStr
	priority sql.NullFloat64
}

func (s *Store) buildTagViews(rows []tagDataRow) []TagView {
	tagMap := make(map[uint]*TagView)
	var tagOrder []uint

	for _, row := range rows {
		tv, exists := tagMap[row.tagID]
		if !exists {
			tv = &TagView{
				ID:           row.tagID,
				Name:         row.tagName,
				Digest:       row.tagDigest,
				Kind:         row.tagKind,
				ChartName:    row.chartName.value,
				ChartVersion: row.chartVersion.value,
				ChartDesc:    row.chartDesc.value,
			}
			if row.tagCreatedAt.valid {
				if t, err := parseTime(row.tagCreatedAt.value); err == nil {
					tv.CreatedAt = t
				}
			}
			tagMap[row.tagID] = tv
			tagOrder = append(tagOrder, row.tagID)
		}

		if row.mDigest.valid && row.configSize != nil {
			img := ImageView{
				Digest:       row.mDigest.value,
				OS:           row.mOS.value,
				Architecture: row.mArch.value,
				Variant:      row.mVariant.value,
				Size:         *row.configSize,
				Stub:         row.isStub,
			}
			if row.configCreated.valid {
				if t, err := parseTime(row.configCreated.value); err == nil {
					img.CreatedAt = t
				}
			}
			tv.Images = append(tv.Images, img)
		}
	}

	result := make([]TagView, 0, len(tagOrder))
	for _, id := range tagOrder {
		tv := tagMap[id]
		tv.MetadataAvailable = len(tv.Images) > 0
		result = append(result, *tv)
	}
	return result
}

func (s *Store) populateAliases(ctx context.Context, repositoryID uint, tagViews []TagView) {
	if len(tagViews) == 0 {
		return
	}

	digestSet := make(map[string]bool)
	for _, tv := range tagViews {
		digestSet[tv.Digest] = true
	}
	digests := make([]string, 0, len(digestSet))
	for d := range digestSet {
		digests = append(digests, d)
	}

	digestToNames := make(map[string][]string, len(digests))
	phs := make([]string, len(digests))
	args := []any{repositoryID}
	for i, d := range digests {
		phs[i] = "?"
		args = append(args, d)
	}

	rows, err := s.query(ctx,
		fmt.Sprintf("SELECT digest, name FROM tags WHERE repo_id = ? AND digest IN (%s)",
			strings.Join(phs, ",")),
		args...)
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var digest, name string
		if err := rows.Scan(&digest, &name); err != nil {
			continue
		}
		digestToNames[digest] = append(digestToNames[digest], name)
	}

	for i := range tagViews {
		names := digestToNames[tagViews[i].Digest]
		if len(names) <= 1 {
			continue
		}
		for _, n := range names {
			if n != tagViews[i].Name {
				tagViews[i].Alias = append(tagViews[i].Alias, n)
			}
		}
	}
}

func (s *Store) GetRegistryStats(ctx context.Context, host string) (*RegistryStatsView, error) {
	var stats RegistryStatsView
	r := s.queryRow(ctx,
		`SELECT COUNT(*) FROM repositories_view WHERE registry_host = ?`, host)
	if err := r.Scan(&stats.RepositoryCount); err != nil {
		return nil, fmt.Errorf("get registry stats: %w", err)
	}

	r = s.queryRow(ctx,
		`SELECT COALESCE(SUM(tags_count), 0) FROM repositories_view WHERE registry_host = ?`, host)
	if err := r.Scan(&stats.TagCount); err != nil {
		return nil, fmt.Errorf("get tag count: %w", err)
	}

	r = s.queryRow(ctx,
		`SELECT COALESCE(SUM(total_size_bytes), 0) FROM repositories_view WHERE registry_host = ?`, host)
	if err := r.Scan(&stats.EstimatedStorageBytes); err != nil {
		return nil, fmt.Errorf("get storage: %w", err)
	}

	coverage, err := s.GetRegistryArchitectureCoverage(ctx, host)
	if err != nil {
		return nil, err
	}
	stats.ArchitectureCount = len(coverage)

	return &stats, nil
}

func (s *Store) GetRegistryStorageByNamespace(ctx context.Context, host string) ([]NamespaceStorageView, error) {
	rows, err := s.query(ctx,
		`SELECT CASE WHEN namespace = '' THEN 'library' ELSE namespace END,
		 COALESCE(SUM(total_size_bytes), 0)
		 FROM repositories_view WHERE registry_host = ? GROUP BY namespace
		 ORDER BY SUM(total_size_bytes) DESC`, host)
	if err != nil {
		return nil, fmt.Errorf("get storage by namespace: %w", err)
	}
	defer rows.Close()

	var result []NamespaceStorageView
	for rows.Next() {
		var ns NamespaceStorageView
		if err := rows.Scan(&ns.Namespace, &ns.TotalSizeBytes); err != nil {
			return nil, fmt.Errorf("scan namespace storage: %w", err)
		}
		ns.DisplayName = ns.Namespace
		result = append(result, ns)
	}
	return result, rows.Err()
}

func (s *Store) GetRegistryArchitectureCoverage(ctx context.Context, host string) ([]ArchitectureCoverageView, error) {
	rows, err := s.query(ctx,
		`SELECT m.architecture,
		 CASE WHEN m.variant != '' THEN m.architecture || '/' || m.variant ELSE m.architecture END,
		 COUNT(DISTINCT t.id)
		 FROM tags t
		 JOIN manifest_platforms mp ON t.digest = mp.index_digest
		 JOIN manifests m ON m.digest = mp.platform_digest
		 JOIN repositories r ON r.id = t.repo_id
		 JOIN registries reg ON reg.id = r.registry_id
		 WHERE reg.host = ?
		 GROUP BY m.architecture, m.variant
		 ORDER BY COUNT(DISTINCT t.id) DESC`, host)
	if err != nil {
		return nil, fmt.Errorf("get architecture coverage: %w", err)
	}
	defer rows.Close()

	var result []ArchitectureCoverageView
	for rows.Next() {
		var ac ArchitectureCoverageView
		var label string
		if err := rows.Scan(&ac.Architecture, &label, &ac.RepositoryCount); err != nil {
			return nil, fmt.Errorf("scan architecture: %w", err)
		}
		ac.Architecture = label
		result = append(result, ac)
	}
	return result, rows.Err()
}

func (s *Store) GetRegistryRepositories(ctx context.Context, host string) ([]RegistryRepositoryRow, error) {
	rows, err := s.query(ctx,
		`SELECT id, name, namespace,
		 CASE WHEN namespace = '' THEN name ELSE namespace || '/' || name END,
		 tags_count, total_size_bytes
		 FROM repositories_view WHERE registry_host = ? ORDER BY name`, host)
	if err != nil {
		return nil, fmt.Errorf("get registry repositories: %w", err)
	}
	defer rows.Close()

	var result []RegistryRepositoryRow
	for rows.Next() {
		var row RegistryRepositoryRow
		if err := rows.Scan(&row.ID, &row.Name, &row.Namespace, &row.DisplayName, &row.TagsCount, &row.TotalSizeInBytes); err != nil {
			return nil, fmt.Errorf("scan registry repo: %w", err)
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

func (s *Store) GetUniqueArchitectures(ctx context.Context) ([]string, error) {
	rows, err := s.query(ctx,
		`SELECT DISTINCT CASE WHEN variant != '' THEN architecture || '/' || variant ELSE architecture END
		 FROM manifests WHERE architecture IS NOT NULL AND architecture != '' UNION
		 SELECT DISTINCT architecture FROM manifest_platforms WHERE architecture != ''
		 ORDER BY 1`)
	if err != nil {
		return nil, fmt.Errorf("get unique architectures: %w", err)
	}
	defer rows.Close()

	var result []string
	for rows.Next() {
		var a string
		if err := rows.Scan(&a); err != nil {
			return nil, fmt.Errorf("scan architecture: %w", err)
		}
		if a != "" {
			result = append(result, a)
		}
	}
	return result, rows.Err()
}

func (s *Store) GetTotalRepositoriesCount(ctx context.Context) (int, error) {
	r := s.queryRow(ctx, "SELECT COUNT(*) FROM repositories")
	var count int
	if err := r.Scan(&count); err != nil {
		return 0, fmt.Errorf("get total repositories count: %w", err)
	}
	return count, nil
}

// Seed inserts test data for development.
func (s *Store) Seed(ctx context.Context) error {
	return s.WithinTx(ctx, func(tx *Store) error {
		return seedData(tx)
	})
}

func seedData(s *Store) error {
	ctx := context.Background()
	if _, err := s.exec(ctx,
		"INSERT OR IGNORE INTO registries (name, host, url, status) VALUES ('dockerhub', 'registry-1.docker.io', 'https://registry-1.docker.io', 1)"); err != nil {
		return err
	}
	if _, err := s.exec(ctx,
		"INSERT OR IGNORE INTO registries (name, host, url, status) VALUES ('ghcr', 'ghcr.io', 'https://ghcr.io', 1)"); err != nil {
		return err
	}

	repos := []struct{ reg, ns, name string }{
		{"dockerhub", "library", "nginx"},
		{"dockerhub", "library", "redis"},
		{"dockerhub", "library", "alpine"},
		{"dockerhub", "", "myapp"},
		{"ghcr", "", "backend"},
	}
	now := time.Now()

	for _, repo := range repos {
		var regID uint
		if err := s.queryRow(ctx, "SELECT id FROM registries WHERE name = ?", repo.reg).Scan(&regID); err != nil {
			return err
		}
		if _, err := s.exec(ctx,
			`INSERT OR IGNORE INTO repositories (registry_id, namespace, name, last_sync_at)
			 VALUES (?, ?, ?, ?)`, regID, repo.ns, repo.name, now); err != nil {
			return err
		}
	}

	return nil
}

type sqlStr struct {
	value string
	valid bool
}

func parseTime(value string) (time.Time, error) {
	t, err := time.Parse("2006-01-02 15:04:05.999999999-07:00", value)
	if err != nil {
		t, err = time.Parse("2006-01-02 15:04:05-07:00", value)
	}
	if err != nil {
		t, err = time.Parse(time.RFC3339Nano, value)
	}
	return t, err
}

func (s *sqlStr) Scan(value any) error {
	if value == nil {
		s.value, s.valid = "", false
		return nil
	}
	switch v := value.(type) {
	case string:
		s.value, s.valid = v, true
	case []byte:
		s.value, s.valid = string(v), true
	}
	return nil
}
