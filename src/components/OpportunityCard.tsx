import { formatDistanceToNow } from "date-fns";
import type { Opportunity, OpportunityType } from "../lib/types";

export function typeLabel(t: OpportunityType) {
  if (t === "tender") return "Tender";
  if (t === "purchase") return "Purchase";
  return "News";
}

export function relativeTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

export function OpportunityCard({
  item,
  selected,
  onSelect,
}: {
  item: Opportunity;
  selected?: boolean;
  onSelect: (item: Opportunity) => void;
}) {
  return (
    <button
      type="button"
      className={`opp-card ${selected ? "active" : ""}`}
      onClick={() => onSelect(item)}
    >
      <div className="opp-top">
        <span className={`type-pill ${item.type}`}>{typeLabel(item.type)}</span>
        {(item.channel === "portal" ||
          item.source === "ntpc_portal" ||
          item.source === "company_portal") && (
          <span className="portal-dot">Portal</span>
        )}
        {item.isNew ? <span className="new-dot">New</span> : null}
        <span className="score">{item.score}</span>
      </div>
      <h3>{item.title}</h3>
      <p className="opp-meta">
        {item.sourceLabel} · {relativeTime(item.publishedAt || item.discoveredAt)}
        {item.companies?.length ? ` · ${item.companies.slice(0, 2).join(", ")}` : ""}
      </p>
    </button>
  );
}
