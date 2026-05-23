package sync

import (
	"context"
	"fmt"
	"time"

	"github.com/eznix86/docker-registry-ui/internal/store"
)

type persister struct {
	s *store.Store
}

func newPersister(s *store.Store) *persister {
	return &persister{s: s}
}

func (p *persister) save(
	ctx context.Context,
	job TagJob,
	digest string,
	graph *ManifestGraph,
) error {
	return p.s.WithinTx(ctx, func(tx *store.Store) error {
		_, err := tx.UpsertTagWithSync(ctx, job.RepositoryID, job.TagName, digest, string(graph.Kind), graph.MediaType, job.PriorityScore)
		if err != nil {
			return fmt.Errorf("upsert tag: %w", err)
		}

		if graph.Kind == KindIndex {
			var indexSize int64
			var indexCreated *time.Time
			for _, pe := range graph.Platforms {
				if len(pe.Raw) > 0 {
					p.savePlatform(ctx, tx, &pe)
				} else {
					p.savePlatformStub(ctx, tx, &pe)
				}
				indexSize += pe.Size
				if pe.ConfigCreated != nil {
					if indexCreated == nil || pe.ConfigCreated.After(*indexCreated) {
						indexCreated = pe.ConfigCreated
					}
				}
			}

			if _, err := tx.UpsertManifestByFields(ctx, digest, graph.MediaType, string(KindIndex),
				string(graph.Raw), "", "", "", "", indexSize, indexCreated); err != nil {
				return fmt.Errorf("upsert index manifest %s: %w", digest, err)
			}

			for _, pe := range graph.Platforms {
				if err := tx.LinkManifestPlatform(ctx, digest, pe.Digest, pe.OS, pe.Architecture, pe.Variant,
					pe.Position, pe.Size); err != nil {
					return fmt.Errorf("link platform %s: %w", pe.Digest, err)
				}
			}
		} else {
			for _, pe := range graph.Platforms {
				p.savePlatform(ctx, tx, &pe)
			}
		}

		if err := tx.UpdateRepositorySyncTime(ctx, job.RepositoryID); err != nil {
			return err
		}
		return nil
	})
}

func (p *persister) savePlatformStub(ctx context.Context, tx *store.Store, pe *PlatformEntry) {
	if _, err := tx.UpsertManifestByFields(ctx,
		pe.Digest, pe.MediaType, string(KindImage),
		"", "", pe.OS, pe.Architecture, pe.Variant, pe.Size, nil,
	); err != nil {
		_ = err
	}
}

func (p *persister) savePlatform(ctx context.Context, tx *store.Store, pe *PlatformEntry) {
	if pe.ConfigDigest != "" {
		if _, err := tx.UpsertConfigBlobByFields(ctx,
			pe.ConfigDigest, pe.ConfigSize,
			string(pe.ConfigRaw), pe.ConfigOS, pe.ConfigArch, pe.ConfigCreated,
		); err != nil {
			_ = err
		}
	}

	var layerDigests []string
	for _, l := range pe.Layers {
		if _, err := tx.UpsertLayerByFields(ctx, l.Digest, l.Size, l.MediaType); err != nil {
			_ = err
		}
		layerDigests = append(layerDigests, l.Digest)
	}

	if _, err := tx.UpsertManifestByFields(ctx,
		pe.Digest, pe.MediaType, string(KindImage),
		string(pe.Raw), pe.ConfigDigest, pe.OS, pe.Architecture, pe.Variant, pe.Size, pe.ConfigCreated,
	); err != nil {
		_ = err
	}

	if len(layerDigests) > 0 {
		if err := tx.LinkManifestLayers(ctx, pe.Digest, layerDigests); err != nil {
			_ = err
		}
	}
}
