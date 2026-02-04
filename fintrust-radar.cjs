/* FINTRUST Minimal-Automatik (CommonJS, keine package.json nötig) */
const fs = require("fs");

// ---------- Konfiguration ----------
const RADAR_FILE = "data/radar_events.json";

// BTC-Regel
const BTC_MOVE_PERCENT = 4;     // ±4 %
const BTC_WINDOW_HOURS = 6;     // innerhalb 6h

// NVDA-News-Regel (sehr simpel, Headline-Häufigkeit)
const NVDA_NEWS_THRESHOLD = 8;  // Treffer im RSS
const NVDA_WINDOW_HOURS = 6;

// ---------- Helpers ----------
function loadRadar() {
  try {
    if (!fs.existsSync(RADAR_FILE)) return [];
    const raw = fs.readFileSync(RADAR_FILE, "utf8").trim();
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    // Fallback: bei kaputtem JSON nicht crashen, sondern neu starten
    return [];
  }
}

function saveRadar(data) {
  fs.writeFileSync(RADAR_FILE, JSON.stringify(data, null, 2));
}

function nowISO() {
  return new Date().toISOString();
}

function sinceMs(hours) {
  return Date.now() - hours * 3600 * 1000;
}

function alreadyExists(radar, asset_id, category, hours) {
  const s = sinceMs(hours);
  return radar.some(e =>
    e &&
    e.asset_id === asset_id &&
    e.category === category &&
    e.detected_at &&
    new Date(e.detected_at).getTime() >= s
  );
}

// Node 18 hat fetch global; falls nicht, hart abbrechen:
function ensureFetch() {
  if (typeof fetch !== "function") {
    throw new Error("fetch() nicht verfügbar (Node-Version prüfen).");
  }
}

// ---------- Regel A: BTC Volatilität (CoinGecko, 1 Tag) ----------
async function checkBTC(radar) {
  const url = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1";
  const res = await fetch(url, { headers: { "accept": "application/json" } });
  if (!res.ok) return;

  const data = await res.json();
  const prices = Array.isArray(data.prices) ? data.prices : [];
  if (prices.length < 10) return;

  const latest = prices[prices.length - 1][1];

  // Preis vor ~BTC_WINDOW_HOURS suchen (erstes Sample nach Grenzzeit)
  const cutoff = sinceMs(BTC_WINDOW_HOURS);
  const idx = prices.findIndex(p => p[0] >= cutoff);
  if (idx < 0) return;

  const past = prices[idx][1];
  if (!past || past === 0) return;

  const change = ((latest - past) / past) * 100;

  if (Math.abs(change) >= BTC_MOVE_PERCENT) {
    if (!alreadyExists(radar, "crypto:btc", "volatility", BTC_WINDOW_HOURS)) {
      radar.push({
        id: `radar_btc_${Date.now()}`,
        asset_id: "crypto:btc",
        category: "volatility",
        severity: "warning",
        message: "Ungewöhnlich starke Bewegung ohne begleitende Fundamentaldaten.",
        detected_at: nowISO()
      });
    }
  }
}

// ---------- Regel B: NVDA Medienüberhitzung (Google News RSS) ----------
async function checkNVDA(radar) {
  const url = "https://news.google.com/rss/search?q=NVIDIA";
  const res = await fetch(url);
  if (!res.ok) return;

  const xml = await res.text();
  // Ultra-minimal: zählt Wort "NVIDIA" im Feed
  const count = (xml.match(/NVIDIA/gi) || []).length;

  if (count >= NVDA_NEWS_THRESHOLD) {
    if (!alreadyExists(radar, "stock:nvda", "news", NVDA_WINDOW_HOURS)) {
      radar.push({
        id: `radar_nvda_${Date.now()}`,
        asset_id: "stock:nvda",
        category: "news",
        severity: "info",
        message: "Erhöhte Medienaufmerksamkeit im Zusammenhang mit KI-Erwartungen.",
        detected_at: nowISO()
      });
    }
  }
}

// ---------- MAIN ----------
(async () => {
  ensureFetch();

  // sicherstellen, dass Ordner existiert
  if (!fs.existsSync("data")) fs.mkdirSync("data", { recursive: true });

  const radar = loadRadar();
  const before = radar.length;

  await checkBTC(radar);
  await checkNVDA(radar);

  if (radar.length !== before) {
    saveRadar(radar);
    console.log("✅ Neues Radar-Ereignis hinzugefügt");
  } else {
    console.log("ℹ️ Keine neuen Ereignisse");
  }
})().catch(err => {
  console.error("❌ Radar-Script Fehler:", err.message || err);
  process.exit(0); // bewusst 0, damit Action nicht “rot” wird wegen API-Aussetzern
});
