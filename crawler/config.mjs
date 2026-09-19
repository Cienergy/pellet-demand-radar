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
    label: "Pellet NITs IN",
    query:
      '("biomass pellet" OR "agro residue pellet" OR "torrefied pellet") (tender OR NIT OR "e-tender" OR EOI OR procurement) India -forecast -"market size"',
  },
  {
    label: "Cofiring / NTPC",
    query: "NTPC (\"biomass pellet\" OR torrefied OR \"agro residue\") (tender OR NIT OR EOI OR procurement OR GeM)",
  },
  {
    label: "State utilities",
    query:
      "(PSPCL OR Mahagenco OR HPGCL OR GSECL OR KPCL OR Haryana OR Punjab) (biomass pellet OR \"paddy straw pellet\") (tender OR enquiry OR procurement)",
  },
  {
    label: "Cement / power buyers",
    query:
      '("Tata Power" OR "Adani Power" OR "JSW Energy" OR UltraTech OR Dalmia) (pellet OR biomass) (tender OR purchase OR procure OR requirement)',
  },
  {
    label: "GeM / eProcure mentions",
    query: '(GeM OR eprocure OR "Central Public Procurement") ("biomass pellet" OR "agro residue") (bid OR tender)',
  },
];
