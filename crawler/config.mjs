/** Watchlist + query pack for Indian biomass / agro pellet demand. */

export const WATCH_COMPANIES = [
  "NTPC",
  "Tata Power",
  "Adani Power",
  "Adani Energy",
  "JSW Energy",
  "JSW Steel",
  "UltraTech",
  "Ambuja",
  "ACC",
  "Dalmia",
  "Shree Cement",
  "SAIL",
  "Jindal",
  "JSPL",
  "Vedanta",
  "Hindalco",
  "NLC",
  "NHPC",
  "Reliance",
  "Torrent Power",
  "CESC",
  "Mahagenco",
  "HPGCL",
  "PSPCL",
  "GSECL",
  "KPCL",
  "DVC",
  "BHEL",
  "IOCL",
  "BPCL",
  "HPCL",
];

export const TENDER_HINTS = [
  "tender",
  "e-tender",
  "etender",
  "nif",
  "notice inviting",
  "bid",
  "rfp",
  "rfq",
  "procurement",
  "gem",
  "eprocure",
  "expression of interest",
  "eoi",
  "corrigendum",
  "invitation",
  "supply of",
];

export const PURCHASE_HINTS = [
  "purchase",
  "procure",
  "procurement",
  "buy",
  "buying",
  "sourcing",
  "offtake",
  "requirement",
  "demand",
  "order",
  "contract",
  "vendor",
  "supplier",
  "co-firing",
  "cofiring",
];

export const QUERIES = [
  {
    label: "Pellet tenders IN",
    query: "biomass pellet tender India OR \"wood pellet\" tender OR \"agro residue pellet\" tender",
  },
  {
    label: "Cofiring / NTPC",
    query: "NTPC (pellet OR \"biomass pellet\" OR \"torrefied\") (tender OR procurement OR purchase OR co-firing)",
  },
  {
    label: "Cement buyers",
    query: "(UltraTech OR Ambuja OR Dalmia OR \"Shree Cement\" OR ACC) (pellet OR biomass) (purchase OR tender OR procure)",
  },
  {
    label: "Power utilities",
    query: '("Tata Power" OR "Adani Power" OR "JSW Energy" OR Mahagenco OR PSPCL OR GSECL) (pellet OR biomass) (tender OR purchase OR requirement)',
  },
  {
    label: "GeM / eProcure",
    query: '("GeM" OR eprocure OR "Central Public Procurement") (pellet OR "biomass pellet") (tender OR bid)',
  },
  {
    label: "Torrefied / RDF",
    query: '(torrefied OR "RDF pellet" OR "agro waste pellet") (India) (tender OR purchase OR demand OR requirement)',
  },
  {
    label: "Company statements",
    query: '"biomass pellet" (buy OR purchase OR procure OR requirement OR "invite bids") India',
  },
  {
    label: "State tenders",
    query: '(Haryana OR Punjab OR Rajasthan OR Gujarat OR Maharashtra OR "Uttar Pradesh") (biomass pellet OR "paddy straw pellet") (tender OR procurement)',
  },
];
