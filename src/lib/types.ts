export type OpportunityType = "tender" | "purchase" | "news";

export type Opportunity = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  sourceLabel: string;
  query?: string;
  type: OpportunityType;
  companies: string[];
  score: number;
  publishedAt: string | null;
  discoveredAt: string;
  isNew?: boolean;
  channel?: string;
};

export type Feed = {
  updatedAt: string;
  crawlDurationMs: number;
  stats: {
    total: number;
    tenders: number;
    purchase: number;
    news: number;
    portals?: number;
    newThisCrawl: number;
    withCompany: number;
  };
  sources: Array<{
    ok: boolean;
    label: string;
    query: string | null;
    count: number;
    error: string | null;
  }>;
  watchCompanies: string[];
  items: Opportunity[];
};
