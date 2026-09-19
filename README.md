# Pellet Demand Radar

Live intel desk for **Indian biomass / agro pellet demand** — tenders, purchase signals, and company mentions.

## What it does

- Continuously crawls public news + tender signals (Google News RSS pack + CPPP keyword scan)
- Classifies items as **Tender**, **Purchase**, or **News**
- Tags major utilities / cement / power buyers (NTPC, Tata Power, UltraTech, …)
- Serves a calm, premium feed UI that auto-refreshes every 60s

## Local

```bash
npm install
npm run crawl   # writes public/data/feed.json
npm run dev
```

## Continuous

GitHub Action `Continuous crawl` runs **every 3 hours** (and on manual dispatch), commits an updated `public/data/feed.json`, which redeploys Pages.

## Deploy

Pushed to `Cienergy/pellet-demand-radar` with GitHub Pages at:

https://cienergy.github.io/pellet-demand-radar/
