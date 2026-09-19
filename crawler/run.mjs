/**
 * Pellet Demand Radar — continuous crawler
 * Pulls Indian biomass/agro pellet tenders, purchase signals, and company news.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { QUERIES, WATCH_COMPANIES, TENDER_HINTS, PURCHASE_HINTS } from "./config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "data", "feed.json");
const HISTORY_CAP = 400;

const parser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent":
      "PelletDemandRadar/1.0 (+https://github.com/Cienergy/pellet-demand-radar; BD intel bot)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

function hashId(url, title) {
  return createHash("sha1").update(`${url || ""}|${title || ""}`).digest("hex").slice(0, 16);
}

function stripHtml(html = "") {
  return cheerio.load(`<body>${html}</body>`)("body").text().replace(/\s+/g, " ").trim();
}

function googleNewsRss(query) {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`;
}

function detectCompanies(text) {
  const lower = text.toLowerCase();
  return WATCH_COMPANIES.filter((c) => lower.includes(c.toLowerCase()));
}

function classify(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  const tenderHits = TENDER_HINTS.filter((h) => text.includes(h)).length;
  const buyHits = PURCHASE_HINTS.filter((h) => text.includes(h)).length;
  const hasPellet =
    /pellet/.test(text) ||
    /biomass fuel/.test(text) ||
    /agro.?residue/.test(text) ||
    /torrefied/.test(text);

  if (!hasPellet && tenderHits + buyHits === 0) {
    return { type: "noise", score: 0 };
  }

  let score = 20;
  if (hasPellet) score += 25;
  score += Math.min(30, tenderHits * 10);
  score += Math.min(25, buyHits * 8);
  if (/india|indian|ntpc|gem\.gov|eprocure|tender/.test(text)) score += 10;

  let type = "news";
  if (tenderHits >= 1 && (hasPellet || buyHits >= 1)) type = "tender";
  else if (buyHits >= 1 && hasPellet) type = "purchase";
  else if (tenderHits >= 2) type = "tender";

  return { type, score: Math.min(100, score) };
}

function relevanceGate(title, summary) {
  const text = `${title} ${summary}`.toLowerCase();
  // Drop obvious non-biomass pellet noise (plastic, animal feed if no biomass context)
  if (/plastic pellet|resin pellet|fish pellet|feed pellet/.test(text) && !/biomass|wood|agro|rdf|torref/.test(text)) {
    return false;
  }
  return (
    /pellet|biomass|agro.?residue|torrefied|rdf|solid recovered fuel|crop residue|paddy straw|mustard stalk/.test(
      text
    )
  );
}

async function fetchRss(label, query) {
  const url = googleNewsRss(query);
  try {
    const feed = await parser.parseURL(url);
    const items = (feed.items || []).map((item) => {
      const title = (item.title || "").trim();
      const summary = stripHtml(item.contentSnippet || item.content || item.summary || "");
      const link = item.link || item.guid || "";
      if (!title || !relevanceGate(title, summary)) return null;

      const { type, score } = classify(title, summary);
      if (type === "noise" || score < 35) return null;

      const companies = detectCompanies(`${title} ${summary}`);
      return {
        id: hashId(link, title),
        title,
        summary: summary.slice(0, 420),
        url: link,
        source: "google_news",
        sourceLabel: label,
        query,
        type,
        companies,
        score,
        publishedAt: item.isoDate || item.pubDate || null,
        discoveredAt: new Date().toISOString(),
      };
    });

    return {
      ok: true,
      label,
      query,
      count: items.filter(Boolean).length,
      items: items.filter(Boolean),
    };
  } catch (err) {
    return {
      ok: false,
      label,
      query,
      error: String(err?.message || err),
      count: 0,
      items: [],
    };
  }
}

async function fetchCpppHints() {
  // Public Central Public Procurement Portal search landing — capture headline cards when available
  const url =
    "https://eprocure.gov.in/cppp/latestactivetendersnew/cpppdata";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "PelletDemandRadar/1.0 (+https://github.com/Cienergy/pellet-demand-radar)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const items = [];
    $("a").each((_, el) => {
      const title = $(el).text().replace(/\s+/g, " ").trim();
      const href = $(el).attr("href") || "";
      if (!title || title.length < 12) return;
      if (!/pellet|biomass|agro.?residue|briquette|torref/i.test(title)) return;
      const link = href.startsWith("http") ? href : `https://eprocure.gov.in${href}`;
      const { type, score } = classify(title, "");
      items.push({
        id: hashId(link, title),
        title,
        summary: "Matched on Central Public Procurement Portal active tenders listing.",
        url: link,
        source: "cppp",
        sourceLabel: "eProcure / CPPP",
        query: "cppp-active",
        type: type === "noise" ? "tender" : type,
        companies: detectCompanies(title),
        score: Math.max(score, 55),
        publishedAt: null,
        discoveredAt: new Date().toISOString(),
      });
    });
    return { ok: true, label: "CPPP", count: items.length, items };
  } catch (err) {
    return { ok: false, label: "CPPP", error: String(err?.message || err), count: 0, items: [] };
  }
}

function loadPrevious() {
  if (!existsSync(OUT)) return { items: [] };
  try {
    return JSON.parse(readFileSync(OUT, "utf8"));
  } catch {
    return { items: [] };
  }
}

function mergeItems(previous, fresh) {
  const map = new Map();
  for (const item of previous) {
    map.set(item.id, { ...item, isNew: false });
  }
  let newCount = 0;
  for (const item of fresh) {
    if (!map.has(item.id)) {
      newCount += 1;
      map.set(item.id, { ...item, isNew: true });
    } else {
      const old = map.get(item.id);
      map.set(item.id, {
        ...old,
        ...item,
        discoveredAt: old.discoveredAt || item.discoveredAt,
        isNew: false,
        score: Math.max(old.score || 0, item.score || 0),
      });
    }
  }
  const items = [...map.values()]
    .sort((a, b) => {
      const da = Date.parse(a.publishedAt || a.discoveredAt || 0);
      const db = Date.parse(b.publishedAt || b.discoveredAt || 0);
      return db - da || (b.score || 0) - (a.score || 0);
    })
    .slice(0, HISTORY_CAP);

  return { items, newCount };
}

async function main() {
  const started = Date.now();
  const previous = loadPrevious();

  const jobs = QUERIES.map((q) => fetchRss(q.label, q.query));
  jobs.push(fetchCpppHints());

  const results = await Promise.all(jobs);
  const fresh = results.flatMap((r) => r.items);
  const { items, newCount } = mergeItems(previous.items || [], fresh);

  const stats = {
    total: items.length,
    tenders: items.filter((i) => i.type === "tender").length,
    purchase: items.filter((i) => i.type === "purchase").length,
    news: items.filter((i) => i.type === "news").length,
    newThisCrawl: newCount,
    withCompany: items.filter((i) => (i.companies || []).length > 0).length,
  };

  const feed = {
    updatedAt: new Date().toISOString(),
    crawlDurationMs: Date.now() - started,
    stats,
    sources: results.map(({ ok, label, query, count, error }) => ({
      ok,
      label,
      query: query || null,
      count,
      error: error || null,
    })),
    watchCompanies: WATCH_COMPANIES,
    items,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(feed, null, 2));
  console.log(
    `Crawl done in ${feed.crawlDurationMs}ms · ${stats.total} items · ${newCount} new · tenders ${stats.tenders}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
