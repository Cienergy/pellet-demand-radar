/**
 * Direct scrapers for company tender boards + NTPC search + news tender packs.
 */
import * as cheerio from "cheerio";
import Parser from "rss-parser";
import {
  BING_NEWS_QUERIES,
  COMPANY_TENDER_PAGES,
  GOOGLE_TENDER_QUERIES,
  NOISE_PATTERNS,
  NTPC_SEARCH_KEYWORDS,
} from "./portals-config.mjs";
import { PURCHASE_HINTS, TENDER_HINTS, WATCH_COMPANIES } from "./config.mjs";

const UA =
  "Mozilla/5.0 (compatible; PelletDemandRadar/1.1; +https://github.com/Cienergy/pellet-demand-radar)";

const parser = new Parser({
  timeout: 20000,
  headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
});

const KEY =
  /pellet|biomass|agro.?residue|torref|briquette|paddy.?straw|crop.?residue|mustard.?husk|rice.?husk|rdf/i;

export function hashId(url, title) {
  let h = 0;
  const s = `${url || ""}|${title || ""}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(8, "0") + s.length.toString(16);
}

function detectCompanies(text) {
  const lower = text.toLowerCase();
  return WATCH_COMPANIES.filter((c) => lower.includes(c.toLowerCase()));
}

function isNoise(title, summary = "") {
  const text = `${title} ${summary}`;
  return NOISE_PATTERNS.some((re) => re.test(text));
}

function classifyPortal(title, summary = "") {
  const text = `${title} ${summary}`.toLowerCase();
  const tenderHits = TENDER_HINTS.filter((h) => text.includes(h)).length;
  const buyHits = PURCHASE_HINTS.filter((h) => text.includes(h)).length;
  let score = 55;
  if (/nit|eoi|e-tender|etender|gem\/|notice inviting|enquiry/i.test(text)) score += 20;
  if (KEY.test(text)) score += 15;
  score += Math.min(15, tenderHits * 4);
  score += Math.min(10, buyHits * 3);
  let type = "tender";
  if (tenderHits === 0 && buyHits >= 1) type = "purchase";
  if (tenderHits === 0 && buyHits === 0 && !/nit|eoi|enquiry|bid|tender/i.test(text)) type = "news";
  return { type, score: Math.min(100, score) };
}

async function fetchHtml(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      ...(opts.headers || {}),
    },
    redirect: "follow",
    signal: AbortSignal.timeout(25000),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text, finalUrl: res.url };
}

function absUrl(href, base) {
  if (!href) return base;
  try {
    return new URL(href, base).href;
  } catch {
    return base;
  }
}

function makeItem({ title, url, summary, source, sourceLabel, companies = [], publishedAt = null, type, score }) {
  const { type: t, score: s } = type && score
    ? { type, score }
    : classifyPortal(title, summary || "");
  return {
    id: hashId(url, title),
    title: title.replace(/\s+/g, " ").trim().slice(0, 280),
    summary: (summary || "").replace(/\s+/g, " ").trim().slice(0, 420),
    url,
    source,
    sourceLabel,
    type: t,
    companies: companies.length ? companies : detectCompanies(`${title} ${summary}`),
    score: s,
        publishedAt,
        discoveredAt: new Date().toISOString(),
        channel: "portal",
        isNew: false,
      };
}

/** NTPC official tender search (form POST). */
export async function scrapeNtpc() {
  const label = "NTPC tender portal";
  try {
    const page = await fetchHtml("https://ntpctender.ntpc.co.in/Index/Search");
    if (!page.ok) throw new Error(`HTTP ${page.status}`);
    const $ = cheerio.load(page.text);
    const token = $('input[name="__RequestVerificationToken"]').attr("value") || "";
    const nc = $('input[name="__ncforminfo"]').attr("value") || "";
    const seen = new Map();

    for (const keyword of NTPC_SEARCH_KEYWORDS) {
      const body = new URLSearchParams({
        Keyword: keyword,
        NITNo: "",
        Region: "",
        Type: "",
        Location: "",
        ContractClassification: "",
        FromDate: "",
        ToDate: "",
        State: "",
        City: "",
        FromEmd: "",
        ToEmd: "",
        FromTender: "",
        ToTender: "",
        __RequestVerificationToken: token,
        __ncforminfo: nc,
      });
      const res = await fetchHtml("https://ntpctender.ntpc.co.in/Index/PostSearch", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: "https://ntpctender.ntpc.co.in",
          Referer: "https://ntpctender.ntpc.co.in/Index/Search",
        },
        body,
      });
      const $$ = cheerio.load(res.text);
      $$("table tr").each((_, tr) => {
        const cells = $$(tr)
          .find("td")
          .map((__, td) => $$(td).text().replace(/\s+/g, " ").trim())
          .get();
        if (cells.length < 3) return;
        const blob = cells.join(" ");
        if (!KEY.test(blob)) return;
        const title =
          cells.find((c) => c.length > 30 && !/^\d+$/.test(c)) ||
          cells[3] ||
          cells[2] ||
          cells[1];
        const ref = cells.find((c) => /GEM\/|NIT|EOI|RE-\d|C&M/i.test(c)) || "";
        const closing = cells.find((c) => /\d{2}[-/]\d{2}[-/]\d{2,4}/.test(c)) || "";
        const href = absUrl($$(tr).find("a[href]").first().attr("href"), "https://ntpctender.ntpc.co.in/");
        const item = makeItem({
          title,
          url: href,
          summary: [ref && `Ref: ${ref}`, closing && `Closes: ${closing}`, `Matched NTPC search “${keyword}”`]
            .filter(Boolean)
            .join(" · "),
          source: "ntpc_portal",
          sourceLabel: label,
          companies: ["NTPC"],
          type: "tender",
          score: 92,
        });
        seen.set(item.id, item);
      });
    }

    const items = [...seen.values()];
    return { ok: true, label, count: items.length, items };
  } catch (err) {
    return { ok: false, label, error: String(err?.message || err), count: 0, items: [] };
  }
}

/** Generic scrape of a company tender listing page. */
export async function scrapeCompanyPage({ label, company, url }) {
  try {
    const page = await fetchHtml(url);
    if (!page.ok) throw new Error(`HTTP ${page.status}`);
    const $ = cheerio.load(page.text);
    const seen = new Map();

    const consider = (title, href, summary = "") => {
      let clean = title.replace(/\s+/g, " ").trim().replace(/^\d+\s+/, "");
      const blob = `${clean} ${href} ${summary}`;
      if (!KEY.test(blob) || clean.length < 12) return;
      if (isNoise(clean, summary)) return;
      const item = makeItem({
        title: clean,
        url: absUrl(href, url),
        summary: summary || `Listed on ${label}`,
        source: "company_portal",
        sourceLabel: label,
        companies: company ? [company] : detectCompanies(clean),
        type: "tender",
        score: 88,
      });
      seen.set(item.id, item);
    };

    $("tr").each((_, tr) => {
      const text = $(tr).text().replace(/\s+/g, " ").trim();
      if (!KEY.test(text) || text.length < 20) return;
      const a = $(tr).find("a[href]").first();
      const href = a.attr("href") || url;
      const title =
        a.text().replace(/\s+/g, " ").trim().length > 20
          ? a.text().replace(/\s+/g, " ").trim()
          : text;
      consider(title.slice(0, 260), href, text.slice(0, 300));
    });

    $("a[href]").each((_, el) => {
      const title = $(el).text().replace(/\s+/g, " ").trim();
      const href = $(el).attr("href") || "";
      if (KEY.test(`${title} ${href}`)) consider(title, href);
    });

    // PDF / document filename hints
    $("a[href$='.pdf'], a[href*='.pdf'], a[href*='Tender'], a[href*='tender']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const title = $(el).text().replace(/\s+/g, " ").trim() || href.split("/").pop() || "";
      if (KEY.test(`${title} ${href}`)) consider(title, href);
    });

    const items = [...seen.values()];
    return { ok: true, label, count: items.length, items };
  } catch (err) {
    return { ok: false, label, error: String(err?.message || err), count: 0, items: [] };
  }
}

function googleNewsRss(query) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
}

function bingNewsRss(query) {
  return `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`;
}

async function scrapeRssPack(pack, builder, source) {
  const results = [];
  for (const { label, query } of pack) {
    try {
      const feed = await parser.parseURL(builder(query));
      const items = [];
      for (const entry of feed.items || []) {
        const title = (entry.title || "").trim();
        const summary = (entry.contentSnippet || entry.content || "").replace(/<[^>]+>/g, " ");
        if (!title || isNoise(title, summary)) continue;
        if (!KEY.test(`${title} ${summary}`)) continue;
        // Prefer tender-like language for this pack
        const { type, score } = classifyPortal(title, summary);
        if (type === "news" && score < 60) continue;
        items.push(
          makeItem({
            title,
            url: entry.link || entry.guid || "",
            summary: summary.slice(0, 420),
            source,
            sourceLabel: label,
            publishedAt: entry.isoDate || entry.pubDate || null,
            type,
            score: Math.max(score, type === "tender" ? 70 : 50),
          })
        );
      }
      results.push({ ok: true, label, query, count: items.length, items });
    } catch (err) {
      results.push({
        ok: false,
        label,
        query,
        error: String(err?.message || err),
        count: 0,
        items: [],
      });
    }
  }
  return results;
}

export async function scrapeAllPortals() {
  const jobs = [
    scrapeNtpc(),
    ...COMPANY_TENDER_PAGES.map((p) => scrapeCompanyPage(p)),
  ];
  const portalResults = await Promise.all(jobs);
  const google = await scrapeRssPack(GOOGLE_TENDER_QUERIES, googleNewsRss, "google_tender_news");
  const bing = await scrapeRssPack(BING_NEWS_QUERIES, bingNewsRss, "bing_tender_news");
  return [...portalResults, ...google, ...bing];
}
