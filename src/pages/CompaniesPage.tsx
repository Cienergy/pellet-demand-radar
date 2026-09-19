import { useMemo } from "react";
import { Link } from "react-router-dom";
import { relativeTime } from "../components/OpportunityCard";
import { useFeed } from "../lib/useFeed";

export function CompaniesPage() {
  const { feed, loading, error } = useFeed();

  const rows = useMemo(() => {
    if (!feed) return [];
    return (feed.watchCompanies || [])
      .map((name) => {
        const hits = feed.items.filter((i) => (i.companies || []).includes(name));
        return {
          name,
          total: hits.length,
          tenders: hits.filter((h) => h.type === "tender").length,
          purchase: hits.filter((h) => h.type === "purchase").length,
          latest: hits[0]?.publishedAt || hits[0]?.discoveredAt || null,
        };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [feed]);

  if (loading && !feed) return <div className="loading">Loading…</div>;
  if (error && !feed) return <div className="error">{error}</div>;
  if (!feed) return null;

  return (
    <div className="page">
      <div className="scan-hero">
        <div>
          <h1>Companies</h1>
          <p>Major Indian buyers / utilities mentioned in the live feed.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>{rows.length} companies with signals</h2>
          <Link className="btn" to="/">Back to feed</Link>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Company</th>
                <th>Signals</th>
                <th>Tenders</th>
                <th>Purchase</th>
                <th>Latest</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td>{r.total}</td>
                  <td>{r.tenders}</td>
                  <td>{r.purchase}</td>
                  <td>{relativeTime(r.latest)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5}>No company matches yet — wait for the next crawl.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
