/**
 * Direct scrapers for company tender boards + NTPC search + news tender packs.
 */
import * as cheerio from "cheerio";
import Parser from "rss-parser";
import {
  BING_NEWS_QUERIES,
  COMPANY_TENDER_PAGES,
  GOOGLE_TENDER_QUERIES,
  LINKEDIN_QUERIES,
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

function makeItem({ title, url, summary, source, sourceLabel, companies = [], publishedAt = null, type, score, channel = "portal" }) {
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
    channel,
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

function decodeBingRedirect(href) {
  if (!href) return "";
  try {
    const u = new URL(href, "https://www.bing.com");
    const uParam = u.searchParams.get("u");
    if (uParam) {
      // Bing often base64-encodes the destination after "a1"
      const raw = uParam.startsWith("a1") ? uParam.slice(2) : uParam;
      try {
        const decoded = Buffer.from(raw, "base64").toString("utf8");
        if (decoded.startsWith("http")) return decoded;
      } catch {
        /* ignore */
      }
    }
    return href.startsWith("http") ? href : `https://www.bing.com${href}`;
  } catch {
    return href;
  }
}

function looksLikeLinkedIn(url, title = "") {
  return /linkedin\.com/i.test(`${url} ${title}`);
}

/** Bing web SERP for site:linkedin.com queries (public indexed posts). */
export async function scrapeLinkedInViaBing() {
  const results = [];
  for (const { label, query } of LINKEDIN_QUERIES) {
    try {
      const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en-IN&cc=IN`;
      const page = await fetchHtml(url, {
        headers: { Accept: "text/html", "Accept-Language": "en-IN,en;q=0.9" },
      });
      if (!page.ok) throw new Error(`HTTP ${page.status}`);
      const $ = cheerio.load(page.text);
      const seen = new Map();

      $("li.b_algo").each((_, el) => {
        const a = $(el).find("h2 a").first();
        const title = a.text().replace(/\s+/g, " ").trim();
        let href = decodeBingRedirect(a.attr("href") || "");
        const summary = $(el).find(".b_caption p, .b_lineclamp2, .b_algoSlug").first().text().replace(/\s+/g, " ").trim();
        if (!title || title.length < 12) return;
        if (!looksLikeLinkedIn(href, title) && !/linkedin/i.test($(el).text())) return;
        if (!KEY.test(`${title} ${summary}`) && !/linkedin\.com\/(posts|feed|pulse|company)/i.test(href)) {
          // still keep if LinkedIn URL strongly matches pellet keywords in title/snippet
          if (!KEY.test(`${title} ${summary}`)) return;
        }
        if (isNoise(title, summary)) return;
        if (!KEY.test(`${title} ${summary}`)) return;

        // Prefer canonical LinkedIn URLs when present in cite
        const cite = $(el).find("cite").text().trim();
        if (/linkedin\.com/i.test(cite) && cite.startsWith("http")) href = cite.split(" ")[0];

        const { type, score } = classifyPortal(title, summary);
        const item = makeItem({
          title,
          url: href || a.attr("href") || url,
          summary: summary || "Public LinkedIn mention indexed via Bing",
          source: "linkedin",
          sourceLabel: label,
          type: type === "news" && /looking for|requirement|procure|tender|purchase|supplier/i.test(`${title} ${summary}`)
            ? "purchase"
            : type,
          score: Math.max(score, 72),
          channel: "linkedin",
        });
        seen.set(item.id, item);
      });

      // Fallback: any LinkedIn anchors on the page
      if (seen.size === 0) {
        $("a[href*='linkedin.com']").each((_, el) => {
          const title = $(el).text().replace(/\s+/g, " ").trim();
          const href = decodeBingRedirect($(el).attr("href") || "");
          if (!title || title.length < 16 || !KEY.test(title)) return;
          if (isNoise(title)) return;
          const item = makeItem({
            title,
            url: href,
            summary: "LinkedIn result",
            source: "linkedin",
            sourceLabel: label,
            type: "purchase",
            score: 70,
            channel: "linkedin",
          });
          seen.set(item.id, item);
        });
      }

      const items = [...seen.values()];
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

/** Google News RSS restricted to LinkedIn-hosted / LinkedIn-mentioned coverage. */
async function scrapeLinkedInViaGoogleNews() {
  const pack = LINKEDIN_QUERIES.map((q) => ({
    ...q,
    label: q.label.replace("LinkedIn ·", "LinkedIn news ·"),
    query: `${q.query} OR (linkedin.com ("biomass pellet" OR "agro residue pellet"))`,
  }));
  const results = await scrapeRssPack(pack, googleNewsRss, "linkedin");
  for (const r of results) {
    r.items = (r.items || [])
      .map((item) => {
        const linked =
          looksLikeLinkedIn(item.url, item.title) ||
          /linkedin/i.test(`${item.title} ${item.summary}`);
        if (!linked && !KEY.test(`${item.title} ${item.summary}`)) return null;
        return {
          ...item,
          source: "linkedin",
          channel: "linkedin",
          score: Math.max(item.score || 0, 68),
        };
      })
      .filter(Boolean);
    r.count = r.items.length;
  }
  return results;
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
  const [portalResults, google, bing, linkedInBing, linkedInGoogle] = await Promise.all([
    Promise.all(jobs),
    scrapeRssPack(GOOGLE_TENDER_QUERIES, googleNewsRss, "google_tender_news"),
    scrapeRssPack(BING_NEWS_QUERIES, bingNewsRss, "bing_tender_news"),
    scrapeLinkedInViaBing(),
    scrapeLinkedInViaGoogleNews(),
  ]);
  return [...portalResults, ...google, ...bing, ...linkedInBing, ...linkedInGoogle];
}
