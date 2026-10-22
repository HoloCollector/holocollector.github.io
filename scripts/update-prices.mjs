#!/usr/bin/env node
// Daily market prices for the shop.
// Reads PRODUCTS from script.js, asks the Pokémon TCG API for TCGplayer
// (USD) and Cardmarket (EUR) prices, and writes prices.json.
//
// Optional: set POKEMONTCG_API_KEY (a GitHub Actions secret is enough).
// The free API works without a key for a small shop.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* =====================================================================
   EDIT THESE PRICE SETTINGS
   ---------------------------------------------------------------------
   Profit is added on top of the market price (1.10 = +10%).
   USD to AED is the fixed dirham peg.
   EUR to USD is only used when a card has no TCGplayer price.
   The live rate is fetched when possible; the number below is the backup.
   Condition: Mint and Near Mint are full price, Lightly Played is 85%,
   Played is 70%.
   ===================================================================== */
const PROFIT = 1.10;
const USD_TO_AED = 3.6725;
const EUR_TO_USD_FALLBACK = 1.08;
const CONDITION_MULTIPLIERS = {
  "Mint": 1,
  "Near Mint": 1,
  "Lightly Played": 0.85,
  "Played": 0.70,
};

// If a card has no `variant`, use the first of these that has a market price.
const VARIANT_PREFERENCE = [
  "holofoil",
  "reverseHolofoil",
  "normal",
  "1stEditionHolofoil",
  "1stEditionNormal",
  "unlimitedHolofoil",
];

const VARIANT_ALIASES = {
  holo: "holofoil",
  holofoil: "holofoil",
  reverse: "reverseHolofoil",
  reverseholo: "reverseHolofoil",
  reverseholofoil: "reverseHolofoil",
  normal: "normal",
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT_PATH = path.join(ROOT, "script.js");
const PRICES_PATH = path.join(ROOT, "prices.json");
const API = "https://api.pokemontcg.io/v2/cards";

function canonicalVariant(value) {
  if (!value) return "";
  const key = String(value).replace(/[\s_-]/g, "").toLowerCase();
  return VARIANT_ALIASES[key] || String(value);
}

function positive(n) {
  const value = Number(n);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function toAed(usd, condition) {
  const mult = CONDITION_MULTIPLIERS[condition] ?? 1;
  const raw = usd * USD_TO_AED * PROFIT * mult;
  // Drop float dust (1.0000000002) before rounding up to a whole dirham.
  const stable = Math.round(raw * 1000) / 1000;
  return Math.max(1, Math.ceil(stable - 1e-9));
}

function readProducts() {
  const src = fs.readFileSync(SCRIPT_PATH, "utf8");
  const start = src.indexOf("const PRODUCTS = [");
  if (start < 0) throw new Error("Could not find the PRODUCTS list in script.js");
  let i = src.indexOf("[", start);
  let depth = 0;
  let quote = null;
  let escape = false;
  let lineComment = false;
  let blockComment = false;
  for (; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (lineComment) {
      if (c === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === "*" && next === "/") {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "/" && next === "/") {
      lineComment = true;
      i++;
      continue;
    }
    if (c === "/" && next === "*") {
      blockComment = true;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) {
        const arrayText = src.slice(src.indexOf("[", start), i + 1);
        return Function(`"use strict"; return (${arrayText});`)();
      }
    }
  }
  throw new Error("PRODUCTS list in script.js did not end");
}

function readPrevious() {
  try {
    const data = JSON.parse(fs.readFileSync(PRICES_PATH, "utf8"));
    if (data && data.cards && typeof data.cards === "object") return data.cards;
  } catch {
    /* first run, or a broken file — start fresh */
  }
  return {};
}

function apiHeaders() {
  const headers = { Accept: "application/json" };
  const key = String(process.env.POKEMONTCG_API_KEY || "").trim();
  if (key) headers["X-Api-Key"] = key;
  return headers;
}

async function apiGet(url) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: apiHeaders() });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
  throw lastError;
}

function sameNumber(a, b) {
  const left = String(a ?? "").split("/")[0].trim().replace(/^0+/, "") || "0";
  const right = String(b ?? "").split("/")[0].trim().replace(/^0+/, "") || "0";
  return left === right;
}

function searchQuery(product) {
  const parts = [];
  const name = String(product.name || "").replace(/"/g, "").trim();
  const setName = String(product.set || "").replace(/"/g, "").trim();
  const number = String(product.number || "").split("/")[0].trim().replace(/^0+/, "");
  if (name) parts.push(`name:"${name}"`);
  if (setName) parts.push(`set.name:"${setName}"`);
  if (number) parts.push(`number:${number}`);
  return parts.join(" ");
}

async function findCard(product) {
  if (product.tcgId) {
    try {
      const body = await apiGet(`${API}/${encodeURIComponent(product.tcgId)}`);
      if (body && body.data) return body.data;
    } catch (error) {
      console.warn(`Could not load tcgId ${product.tcgId} for ${product.id}: ${error.message}`);
    }
  }
  const q = searchQuery(product);
  if (!q) return null;
  const body = await apiGet(`${API}?q=${encodeURIComponent(q)}&pageSize=20`);
  const cards = (body && body.data) || [];
  if (!cards.length) return null;
  return (
    cards.find((card) => {
      const numberOk = !product.number || sameNumber(card.number, product.number);
      const setOk = !product.set || String(card.set?.name || "").toLowerCase() === String(product.set).toLowerCase();
      return numberOk && setOk;
    }) || cards[0]
  );
}

function pickTcgplayer(prices, variant) {
  if (!prices || typeof prices !== "object") return null;
  const wanted = canonicalVariant(variant);
  if (wanted) {
    const chosen = positive(prices[wanted] && prices[wanted].market);
    if (chosen) return { variant: wanted, usd: chosen };
  }
  for (const key of VARIANT_PREFERENCE) {
    const market = positive(prices[key] && prices[key].market);
    if (market) return { variant: key, usd: market };
  }
  let best = null;
  for (const [key, row] of Object.entries(prices)) {
    const market = positive(row && row.market);
    if (!market) continue;
    if (!best || market > best.usd) best = { variant: key, usd: market };
  }
  return best;
}

function pickCardmarket(prices, variant) {
  if (!prices || typeof prices !== "object") return null;
  const wanted = canonicalVariant(variant);
  if (wanted === "reverseHolofoil") {
    const reverse = positive(prices.reverseHoloTrend);
    if (reverse) return { field: "reverseHoloTrend", eur: reverse };
  }
  const trend = positive(prices.trendPrice);
  if (trend) return { field: "trendPrice", eur: trend };
  const reverse = positive(prices.reverseHoloTrend);
  if (reverse) return { field: "reverseHoloTrend", eur: reverse };
  return null;
}

let eurToUsdRate = null;
async function eurToUsd() {
  if (eurToUsdRate) return eurToUsdRate;
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=USD");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const rate = positive(body.rates && body.rates.USD);
    if (!rate) throw new Error("missing USD rate");
    eurToUsdRate = { rate, source: `frankfurter ${body.date}` };
  } catch (error) {
    console.warn(`EUR to USD lookup failed (${error.message}). Using ${EUR_TO_USD_FALLBACK}.`);
    eurToUsdRate = { rate: EUR_TO_USD_FALLBACK, source: "fallback" };
  }
  return eurToUsdRate;
}

async function quoteCard(product, apiCard) {
  const updated = new Date().toISOString().slice(0, 10);
  const tcg = pickTcgplayer(apiCard?.tcgplayer?.prices, product.variant);
  if (tcg) {
    const price = toAed(tcg.usd, product.condition);
    return {
      price,
      updated,
      source: `tcgplayer:${tcg.variant}`,
      detail: {
        marketUsd: tcg.usd,
        usdToAed: USD_TO_AED,
        profit: PROFIT,
        condition: product.condition || "",
        conditionMultiplier: CONDITION_MULTIPLIERS[product.condition] ?? 1,
        rawAed: tcg.usd * USD_TO_AED * PROFIT * (CONDITION_MULTIPLIERS[product.condition] ?? 1),
        apiId: apiCard.id,
      },
    };
  }
  const cm = pickCardmarket(apiCard?.cardmarket?.prices, product.variant);
  if (!cm) return null;
  const fx = await eurToUsd();
  const usd = cm.eur * fx.rate;
  const price = toAed(usd, product.condition);
  return {
    price,
    updated,
    source: `cardmarket:${cm.field}`,
    detail: {
      marketEur: cm.eur,
      eurToUsd: fx.rate,
      eurSource: fx.source,
      marketUsd: usd,
      usdToAed: USD_TO_AED,
      profit: PROFIT,
      condition: product.condition || "",
      conditionMultiplier: CONDITION_MULTIPLIERS[product.condition] ?? 1,
      rawAed: usd * USD_TO_AED * PROFIT * (CONDITION_MULTIPLIERS[product.condition] ?? 1),
      apiId: apiCard.id,
    },
  };
}

async function priceProduct(product) {
  const apiCard = await findCard(product);
  if (!apiCard) return null;
  const quote = await quoteCard(product, apiCard);
  if (!quote) return null;
  return { apiCard, quote };
}

function writePrices(cards) {
  const body = {
    updated: new Date().toISOString().slice(0, 10),
    cards,
  };
  const tmp = `${PRICES_PATH}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(body, null, 2)}\n`);
  fs.renameSync(tmp, PRICES_PATH);
}

function printQuote(label, product, result) {
  if (!result) {
    console.log(`${label}: no price (fallback ${product.price} AED)`);
    return;
  }
  const { apiCard, quote } = result;
  const d = quote.detail;
  console.log(`\n${label}`);
  console.log(`  card: ${apiCard.name} · ${apiCard.set?.name} · #${apiCard.number} · id ${apiCard.id}`);
  console.log(`  source: ${quote.source}`);
  if (d.marketEur != null) {
    console.log(`  Cardmarket ${d.marketEur} EUR × ${d.eurToUsd} (${d.eurSource}) = ${d.marketUsd.toFixed(4)} USD`);
  } else {
    console.log(`  TCGplayer market ${d.marketUsd} USD`);
  }
  console.log(
    `  ${d.marketUsd.toFixed(4)} USD × ${d.usdToAed} × ${d.profit} × ${d.conditionMultiplier} (${d.condition || "no condition"}) = ${d.rawAed.toFixed(4)} AED`
  );
  console.log(`  round up, minimum 1 → ${quote.price} AED`);
}

async function demo() {
  const byId = {
    id: "demo-detective-pikachu",
    name: "Detective Pikachu",
    set: "Detective Pikachu",
    number: "10",
    tcgId: "det1-10",
    condition: "Near Mint",
    price: 15,
  };
  const byName = {
    id: "demo-lucario",
    name: "Lucario",
    set: "Brilliant Stars",
    number: "079/172",
    condition: "Near Mint",
    price: 5,
  };
  const priced = await priceProduct(byId);
  printQuote("Example with tcgId det1-10", byId, priced);
  if (!priced || priced.quote.source.startsWith("tcgplayer") === false) {
    throw new Error("Demo card did not return a TCGplayer price");
  }
  const withoutTcg = {
    ...priced.apiCard,
    tcgplayer: undefined,
  };
  const cardmarket = await quoteCard(byId, withoutTcg);
  printQuote("Same card if TCGplayer is missing", byId, cardmarket ? { apiCard: priced.apiCard, quote: cardmarket } : null);
  try {
    const matched = await priceProduct(byName);
    printQuote("Example matched by set name + number (no tcgId)", byName, matched);
  } catch (error) {
    console.warn(`Name match example skipped: ${error.message}`);
  }
}

async function updateAll() {
  const products = readProducts();
  const previous = readPrevious();
  const cards = {};
  let lookedUp = 0;
  let kept = 0;
  for (const product of products) {
    if (!product || !product.id) continue;
    if (product.autoPrice === false) {
      console.log(`${product.id}: autoPrice is false, keeping typed price ${product.price} AED`);
      continue;
    }
    lookedUp++;
    try {
      const result = await priceProduct(product);
      if (!result) throw new Error("no market price");
      const { price, updated, source } = result.quote;
      cards[product.id] = { price, updated, source };
      console.log(`${product.id}: ${price} AED (${source})`);
    } catch (error) {
      if (previous[product.id]) {
        cards[product.id] = previous[product.id];
        kept++;
        console.warn(`${product.id}: lookup failed (${error.message}). Kept the last saved price.`);
      } else {
        console.warn(`${product.id}: lookup failed (${error.message}). The site will use the typed price.`);
      }
    }
  }
  writePrices(cards);
  console.log(`Saved prices.json (${lookedUp} looked up, ${kept} kept from last time, ${Object.keys(cards).length} stored).`);
}

const demoMode = process.argv.includes("--demo");
try {
  if (demoMode) await demo();
  else await updateAll();
} catch (error) {
  console.error(`Price update failed: ${error.message}`);
  // A demo run should fail loudly. The daily deploy must still publish the site.
  process.exit(demoMode ? 1 : 0);
}
