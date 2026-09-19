/** Curated Indian tender portals + company boards. */

export const NTPC_SEARCH_KEYWORDS = [
  "pellet",
  "biomass",
  "torrefied",
  "agro residue",
  "paddy straw",
];

/** Static tender listing pages to scrape for pellet / biomass keywords. */
export const COMPANY_TENDER_PAGES = [
  {
    label: "PSPCL tenders",
    company: "PSPCL",
    url: "https://www.pspcl.in/tenders.aspx",
  },
  {
    label: "Mahagenco tenders",
    company: "Mahagenco",
    url: "https://www.mahagenco.in/tenders",
  },
  {
    label: "HPGCL tenders",
    company: "HPGCL",
    url: "https://hpgcl.org.in/tenders",
  },
  {
    label: "GSECL tenders",
    company: "GSECL",
    url: "https://www.gsecl.in/tenders",
  },
  {
    label: "Tata Power tenders",
    company: "Tata Power",
    url: "https://www.tatapower.com/tender",
  },
  {
    label: "Adani Power tenders",
    company: "Adani Power",
    url: "https://www.adanipower.com/tenders",
  },
  {
    label: "Adani downloads",
    company: "Adani Power",
    url: "https://www.adanipower.com/downloads",
  },
  {
    label: "NTPC live tenders",
    company: "NTPC",
    url: "https://ntpctender.ntpc.co.in/",
  },
];

export const BING_NEWS_QUERIES = [
  {
    label: "Bing · pellet tenders",
    query: '"biomass pellet" (tender OR NIT OR "notice inviting" OR e-tender OR procurement) India',
  },
  {
    label: "Bing · NTPC / GeM",
    query: '(NTPC OR GeM OR eprocure OR PSPCL OR Mahagenco) ("biomass pellet" OR "agro residue pellet" OR torrefied) (tender OR bid OR EOI)',
  },
];

export const GOOGLE_TENDER_QUERIES = [
  {
    label: "Google · live NITs",
    query:
      '("biomass pellet" OR "agro residue based pellet" OR "torrefied biomass") (NIT OR "Notice Inviting Tender" OR "e-Tender" OR "GeM bid" OR EOI) India -market -forecast -"market size"',
  },
  {
    label: "Google · utility buys",
    query:
      '(NTPC OR PSPCL OR Mahagenco OR HPGCL OR GSECL OR "Tata Power" OR "Adani Power") (pellet) (tender OR procurement OR "invite bids" OR EOI)',
  },
];

export const NOISE_PATTERNS = [
  /market size/i,
  /growth report/i,
  /forecast 20\d{2}/i,
  /market research/i,
  /fortune business insights/i,
  /futuremarketinsights/i,
  /grand view research/i,
  /yellowknife/i,
  /stormont/i,
  /south korea/i,
  /n\.w\.t/i,
  /nit srinagar/i,
];
