import { useEffect, useMemo, useState } from "react";
import { OpportunityCard, relativeTime, typeLabel } from "../components/OpportunityCard";
import type { Opportunity, OpportunityType } from "../lib/types";
import { formatStamp } from "../lib/time";
import { useFeed } from "../lib/useFeed";

export function FeedPage() {
  const { feed, loading, refreshing, error, refresh, lastFetch } = useFeed();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [q, setQ] = useState("");
  const [type, setType] = useState<OpportunityType | "all">("tender");
  const [company, setCompany] = useState("");
  const [channel, setChannel] = useState<"all" | "portal" | "news" | "linkedin">("all");
  const [selected, setSelected] = useState<Opportunity | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    if (!feed) return [];
    const qq = q.trim().toLowerCase();
    return feed.items.filter((item) => {
      if (type !== "all" && item.type !== type) return false;
      if (company && !(item.companies || []).some((c) => c === company)) return false;
      const isPortal =
        item.channel === "portal" ||
        item.source === "ntpc_portal" ||
        item.source === "company_portal";
      const isLinkedIn = item.channel === "linkedin" || item.source === "linkedin";
      if (channel === "portal" && !isPortal) return false;
      if (channel === "linkedin" && !isLinkedIn) return false;
      if (channel === "news" && (isPortal || isLinkedIn)) return false;
      if (!qq) return true;
      const blob = `${item.title} ${item.summary} ${(item.companies || []).join(" ")}`.toLowerCase();
      return blob.includes(qq);
    });
  }, [feed, q, type, company, channel]);

  if (loading && !feed) return <div className="loading">Loading live feed…</div>;
  if (error && !feed) return <div className="error">{error}</div>;
  if (!feed) return <div className="error">No feed yet — run a crawl.</div>;

  const active = selected && filtered.find((i) => i.id === selected.id) ? selected : filtered[0] || null;

  return (
    <div className="page">
      <div className="kpi-row">
        <div className="kpi-card tone-teal">
          <div className="kpi-label">Live items</div>
          <div className="kpi-value">{feed.stats.total}</div>
        </div>
        <div className="kpi-card tone-blue">
          <div className="kpi-label">Tenders</div>
          <div className="kpi-value">{feed.stats.tenders}</div>
        </div>
        <div className="kpi-card tone-amber">
          <div className="kpi-label">Purchase signals</div>
          <div className="kpi-value">{feed.stats.purchase}</div>
        </div>
        <div className="kpi-card tone-rose">
          <div className="kpi-label">LinkedIn</div>
          <div className="kpi-value">{feed.stats.linkedin ?? 0}</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, company, keywords…"
        />
        <select value={type} onChange={(e) => setType(e.target.value as OpportunityType | "all")}>
          <option value="tender">Tenders</option>
          <option value="purchase">Purchase</option>
          <option value="news">News</option>
          <option value="all">All types</option>
        </select>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as "all" | "portal" | "news" | "linkedin")}
        >
          <option value="all">All sources</option>
          <option value="portal">Company / portals</option>
          <option value="linkedin">LinkedIn</option>
          <option value="news">News wire</option>
        </select>
        <select value={company} onChange={(e) => setCompany(e.target.value)}>
          <option value="">All companies</option>
          {(feed.watchCompanies || []).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn primary"
          disabled={refreshing}
          onClick={() => void refresh(true)}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
        <span className="live-pill" title={feed.updatedAt}>
          <span className="pulse" />
          Crawl {formatStamp(feed.updatedAt, nowMs)}
          {lastFetch ? ` · checked ${formatStamp(lastFetch, nowMs)}` : ""}
        </span>
        {error ? <span className="toolbar-error">{error}</span> : null}
      </div>

      <div className="feed-layout">
        <aside className="feed-list">
          {filtered.length === 0 ? (
            <p className="muted empty">No matches.</p>
          ) : (
            filtered.map((item) => (
              <OpportunityCard
                key={item.id}
                item={item}
                selected={active?.id === item.id}
                onSelect={setSelected}
              />
            ))
          )}
        </aside>

        <section className="feed-detail panel">
          {active ? (
            <>
              <div className="panel-head">
                <div className="detail-tags">
                  <span className={`type-pill ${active.type}`}>{typeLabel(active.type)}</span>
                  <span className="muted">Score {active.score}</span>
                </div>
                <a className="btn primary" href={active.url} target="_blank" rel="noreferrer">
                  Open source
                </a>
              </div>
              <div className="panel-body detail-body">
                <h1>{active.title}</h1>
                <p className="meta-line">
                  {active.sourceLabel} · {relativeTime(active.publishedAt || active.discoveredAt)}
                </p>
                {active.companies?.length > 0 && (
                  <div className="chip-row">
                    {active.companies.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="chip"
                        onClick={() => setCompany(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                <p className="summary">{active.summary || "No summary available."}</p>
              </div>
            </>
          ) : (
            <div className="panel-body">
              <p className="muted">Select an opportunity.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
