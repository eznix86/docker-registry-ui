package store

import (
	"context"
	"database/sql"
	"fmt"
	"sort"
	"strings"
	"time"

	"golang.org/x/mod/semver"
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
	applyVersionSort := false
	switch filter.SortBy {
	case "size-asc":
		orderClause = "total_size ASC"
	case "size-desc":
		orderClause = "total_size DESC"
	case "oldest":
		applyVersionSort = true
	case "name-asc":
		orderClause = "name ASC"
	case "name-desc":
		orderClause = "name DESC"
	default:
		applyVersionSort = true
	}

	offset := (pagination.Page - 1) * pagination.PageSize
	limit := pagination.PageSize
	queryOffset := offset
	if applyVersionSort {
		limit = 0
		queryOffset = 0
	}

	rows, err := s.queryTagData(ctx, repositoryID, filter.Name, orderClause, limit, queryOffset)
	if err != nil {
		return ScrollResult{}, err
	}

	tagViews := s.buildTagViews(rows)
	s.populateAliases(ctx, repositoryID, tagViews)
	if applyVersionSort {
		s.sortTagViewsByVersion(tagViews, filter.SortBy == "oldest")
		tagViews = paginateTagViews(tagViews, offset, pagination.PageSize)
	}

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
	tagCreatedAt  sql.NullString
	mDigest       sql.NullString
	mOS           sql.NullString
	mArch         sql.NullString
	mVariant      sql.NullString
	configSize    *int64
	configCreated sql.NullString
	isStub        bool
	chartName     sql.NullString
	chartVersion  sql.NullString
	chartDesc     sql.NullString
	chartAPIVer   sql.NullString
	chartType     sql.NullString
}

func (s *Store) queryTagData(ctx context.Context, repositoryID uint, nameFilter, order string, limit, offset int) ([]tagDataRow, error) {
	var nameCond string
	var args []any
	args = append(args, repositoryID)

	if nameFilter != "" {
		nameCond = "AND name LIKE ?"
		args = append(args, "%"+nameFilter+"%")
	}

	limitClause := ""
	if limit > 0 {
		limitClause = "LIMIT ? OFFSET ?"
		args = append(args, limit, offset)
	}

	query := fmt.Sprintf(`
		WITH filtered_tags AS (
			SELECT
				id, name, digest, kind, created_at, chart_name, chart_version, chart_desc,
				chart_api_version, chart_type,
				ROW_NUMBER() OVER (ORDER BY %s) AS sort_order
			FROM tags_view
			WHERE repository_id = ? %s
			ORDER BY %s
			%s
		)
		SELECT
			ft.id, ft.name, ft.digest, ft.kind, ft.created_at,
			m.digest, m.os, m.architecture, m.variant,
			m.size_bytes, m.created,
			ft.chart_name, ft.chart_version, ft.chart_desc,
			ft.chart_api_version, ft.chart_type
		FROM filtered_tags ft
		LEFT JOIN manifests m ON m.digest = ft.digest AND ft.kind IN ('image', 'helm')
		ORDER BY ft.sort_order, m.digest`, order, nameCond, order, limitClause)

	rows, err := s.query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query tag data: %w", err)
	}
	defer closeRows(rows)

	var out []tagDataRow
	for rows.Next() {
		var r tagDataRow
		if err := rows.Scan(&r.tagID, &r.tagName, &r.tagDigest, &r.tagKind, &r.tagCreatedAt,
			&r.mDigest, &r.mOS, &r.mArch, &r.mVariant,
			&r.configSize, &r.configCreated, &r.chartName, &r.chartVersion, &r.chartDesc,
			&r.chartAPIVer, &r.chartType); err != nil {
			return nil, fmt.Errorf("scan tag row: %w", err)
		}
		out = append(out, r)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}

	out, err = s.appendIndexChildren(ctx, out)
	if err != nil {
		return nil, err
	}

	return out, nil
}

func (s *Store) appendIndexChildren(ctx context.Context, rows []tagDataRow) ([]tagDataRow, error) {
	var indexIDs []uint
	indexRows := make(map[uint]int)
	for i, row := range rows {
		if row.mDigest.Valid {
			continue
		}
		indexIDs = append(indexIDs, row.tagID)
		indexRows[row.tagID] = i
	}
	if len(indexIDs) == 0 {
		return rows, nil
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
		return nil, fmt.Errorf("query index tag metadata: %w", err)
	}
	defer closeRows(kindRows)

	var indexDigests []string
	indexMeta := make(map[uint]tagMeta)
	for kindRows.Next() {
		var id uint
		var kind, digest string
		var lastSync sql.NullString
		var priority sql.NullFloat64
		if err := kindRows.Scan(&id, &kind, &digest, &lastSync, &priority); err != nil {
			return nil, fmt.Errorf("scan index tag metadata: %w", err)
		}
		if kind == "index" {
			indexDigests = append(indexDigests, digest)
			indexMeta[id] = tagMeta{digest: digest}
		}
	}
	if err := kindRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate index tag metadata: %w", err)
	}

	if len(indexDigests) == 0 {
		return rows, nil
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
		return nil, fmt.Errorf("query index child manifests: %w", err)
	}
	defer closeRows(childRows)

	type childRow struct {
		indexDigest string
		childDigest sql.NullString
		os          sql.NullString
		arch        sql.NullString
		variant     sql.NullString
		size        int64
		created     sql.NullString
		isStub      int64
	}
	childrenByIndex := make(map[string][]childRow)
	for childRows.Next() {
		var cr childRow
		if err := childRows.Scan(&cr.indexDigest, &cr.childDigest, &cr.os, &cr.arch, &cr.variant, &cr.size, &cr.created, &cr.isStub); err != nil {
			return nil, fmt.Errorf("scan index child manifest: %w", err)
		}
		childrenByIndex[cr.indexDigest] = append(childrenByIndex[cr.indexDigest], cr)
	}
	if err := childRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate index child manifests: %w", err)
	}

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
		rows[rowIdx].mDigest = sql.NullString{}
	}

	return rows, nil
}

type tagMeta struct {
	digest string
}

func (s *Store) buildTagViews(rows []tagDataRow) []TagView {
	tagMap := make(map[uint]*TagView)
	var tagOrder []uint

	for _, row := range rows {
		tv, exists := tagMap[row.tagID]
		if !exists {
			tv = &TagView{
				ID:              row.tagID,
				Name:            row.tagName,
				Digest:          row.tagDigest,
				Kind:            row.tagKind,
				ChartName:       row.chartName.String,
				ChartVersion:    row.chartVersion.String,
				ChartDesc:       row.chartDesc.String,
				ChartAPIVersion: row.chartAPIVer.String,
				ChartType:       row.chartType.String,
			}
			if row.tagCreatedAt.Valid {
				if t, err := parseTime(row.tagCreatedAt.String); err == nil {
					tv.CreatedAt = t
				}
			}
			tagMap[row.tagID] = tv
			tagOrder = append(tagOrder, row.tagID)
		}

		if row.mDigest.Valid && row.configSize != nil {
			img := ImageView{
				Digest:       row.mDigest.String,
				OS:           row.mOS.String,
				Architecture: row.mArch.String,
				Variant:      row.mVariant.String,
				Size:         *row.configSize,
				Stub:         row.isStub,
			}
			if row.configCreated.Valid {
				if t, err := parseTime(row.configCreated.String); err == nil {
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
	defer closeRows(rows)

	for rows.Next() {
		var digest, name string
		if err := rows.Scan(&digest, &name); err != nil {
			continue
		}
		digestToNames[digest] = append(digestToNames[digest], name)
	}
	if err := rows.Err(); err != nil {
		return
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

func (s *Store) sortTagViewsByVersion(tagViews []TagView, ascending bool) {
	sort.SliceStable(tagViews, func(i, j int) bool {
		leftVersion, leftOK := canonicalSemver(tagViews[i].Name)
		rightVersion, rightOK := canonicalSemver(tagViews[j].Name)

		switch {
		case leftOK && rightOK:
			cmp := semver.Compare(leftVersion, rightVersion)
			if cmp == 0 {
				return compareTagViewFallback(tagViews[i], tagViews[j], ascending)
			}
			if ascending {
				return cmp < 0
			}
			return cmp > 0
		case leftOK != rightOK:
			return leftOK
		default:
			return compareTagViewFallback(tagViews[i], tagViews[j], ascending)
		}
	})
}

func paginateTagViews(tagViews []TagView, offset, pageSize int) []TagView {
	if offset >= len(tagViews) {
		return []TagView{}
	}

	end := min(offset+pageSize, len(tagViews))

	return tagViews[offset:end]
}

func canonicalSemver(tagName string) (string, bool) {
	version := tagName
	if !strings.HasPrefix(version, "v") {
		version = "v" + version
	}

	if !semver.IsValid(version) {
		return "", false
	}

	return version, true
}

func compareTagViewFallback(left, right TagView, ascending bool) bool {
	if !left.CreatedAt.Equal(right.CreatedAt) {
		if ascending {
			return left.CreatedAt.Before(right.CreatedAt)
		}
		return left.CreatedAt.After(right.CreatedAt)
	}

	if ascending {
		return left.Name < right.Name
	}

	return left.Name > right.Name
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
	defer closeRows(rows)

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

func (s *Store) GetStorageUsageByRegistry(ctx context.Context) ([]RegistryStorageUsageView, error) {
	rows, err := s.query(ctx, `
		SELECT
			r.host,
			CASE WHEN r.name = '' THEN r.host ELSE r.name END,
			COALESCE(SUM(rv.total_size_bytes), 0)
		FROM registries r
		LEFT JOIN repositories_view rv ON rv.registry_host = r.host
		GROUP BY r.host, r.name
		ORDER BY SUM(rv.total_size_bytes) DESC, r.host ASC`)
	if err != nil {
		return nil, fmt.Errorf("get storage usage by registry: %w", err)
	}
	defer closeRows(rows)

	var result []RegistryStorageUsageView
	for rows.Next() {
		var item RegistryStorageUsageView
		if err := rows.Scan(&item.RegistryHost, &item.DisplayName, &item.TotalSizeBytes); err != nil {
			return nil, fmt.Errorf("scan registry storage usage: %w", err)
		}
		result = append(result, item)
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
	defer closeRows(rows)

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
	defer closeRows(rows)

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
	defer closeRows(rows)

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
