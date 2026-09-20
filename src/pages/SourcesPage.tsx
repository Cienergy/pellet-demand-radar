import { formatStamp } from "../lib/time";
import { useFeed } from "../lib/useFeed";

export function SourcesPage() {
  const { feed, loading, error } = useFeed();

  if (loading && !feed) return <div className="loading">Loading…</div>;
  if (error && !feed) return <div className="error">{error}</div>;
  if (!feed) return null;

  return (
    <div className="page">
      <div className="scan-hero">
        <div>
          <h1>Sources</h1>
          <p>
            Twice-hourly crawler (GitHub Actions may delay) · last crawl{" "}
            <span title={feed.updatedAt}>{formatStamp(feed.updatedAt)}</span> ·{" "}
            {(feed.crawlDurationMs / 1000).toFixed(1)}s
          </p>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi-card tone-teal">
          <div className="kpi-label">Sources ok</div>
          <div className="kpi-value">{feed.sources.filter((s) => s.ok).length}</div>
        </div>
        <div className="kpi-card tone-amber">
          <div className="kpi-label">Sources failed</div>
          <div className="kpi-value">{feed.sources.filter((s) => !s.ok).length}</div>
        </div>
        <div className="kpi-card tone-blue">
          <div className="kpi-label">Queries</div>
          <div className="kpi-value">{feed.sources.length}</div>
        </div>
        <div className="kpi-card tone-rose">
          <div className="kpi-label">History cap</div>
          <div className="kpi-value">400</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Crawl pack</h2></div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Status</th>
                <th>Label</th>
                <th>Hits</th>
                <th>Query / note</th>
              </tr>
            </thead>
            <tbody>
              {feed.sources.map((s) => (
                <tr key={`${s.label}-${s.query}`}>
                  <td>
                    <span className={`level ${s.ok ? "strong" : "weak"}`}>
                      {s.ok ? "ok" : "fail"}
                    </span>
                  </td>
                  <td>{s.label}</td>
                  <td>{s.count}</td>
                  <td className="wrap">{s.error || s.query || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
