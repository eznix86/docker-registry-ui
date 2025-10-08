
export default function Explore({Registries, Repositories}) {
  return (
    <div>
      <h1>Docker Registry Explorer</h1>
      
      <h2>Registries</h2>
      <div>
        {Registries && Registries.length > 0 ? (
          <ul>
            {Registries.map((registry, index) => (
              <li key={index}>
                <strong>Name:</strong> {registry.Name} | <strong>Status:</strong> {registry.Status}
              </li>
            ))}
          </ul>
        ) : (
          <p>No registries found</p>
        )}
      </div>

      <h2>Repositories</h2>
      <div>
        {Repositories && Repositories.length > 0 ? (
          <ul>
            {Repositories.map((repo, index) => (
              <li key={index}>
                <div>
                  <strong>Name:</strong> {repo.Name}
                </div>
                <div>
                  <strong>Registry:</strong> {repo.Registry}
                </div>
                <div>
                  <strong>Size:</strong> {repo.Size}
                </div>
                <div>
                  <strong>Architectures:</strong> {repo.Architectures ? repo.Architectures.join(', ') : 'N/A'}
                </div>
                <div>
                  <strong>Crawl State:</strong> {repo.CrawlState}
                </div>
                <div>
                  <strong>Last Synced At:</strong> {repo.LastSyncedAt}
                </div>
                <hr />
              </li>
            ))}
          </ul>
        ) : (
          <p>No repositories found</p>
        )}
      </div>
    </div>
  )
}