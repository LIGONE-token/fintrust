/* FINTRUST Radar – Frontend (real data only, no demos) */

(async () => {
  const app = document.getElementById("app");
  if (!app) {
    console.error("❌ #app nicht gefunden");
    return;
  }

  // -------- Daten laden (ECHT) --------
  let radar = [];
  try {
    const res = await fetch("data/radar_events.json", { cache: "no-store" });
    if (res.ok) {
      radar = await res.json();
    }
  } catch (e) {
    radar = [];
  }

  // -------- Router --------
  function router() {
    const hash = location.hash || "#/radar";

    if (hash.startsWith("#/radar/")) {
      const assetId = hash.split("/")[2];
      renderRadarDetail(assetId);
      return;
    }

    if (hash === "#/radar") {
      renderRadarList();
      return;
    }

    app.innerHTML = `<p>Unbekannte Ansicht</p>`;
  }

  window.addEventListener("hashchange", router);
  router();

  // -------- Radar-Liste --------
  function renderRadarList() {
    if (!radar.length) {
      app.innerHTML = `
        <h1>FINTRUST Radar</h1>
        <p>Aktuell liegen keine Radar-Warnungen vor.</p>
      `;
      return;
    }

    const items = radar
      .slice()
      .sort((a, b) => new Date(b.detected_at) - new Date(a.detected_at))
      .map(e => `
        <li class="card">
          <strong>${e.asset_id}</strong><br>
          <small>
            ${e.category} · ${e.severity} ·
            ${new Date(e.detected_at).toLocaleString("de-CH")}
          </small>
          <p>${e.message}</p>
          <a href="#/radar/${e.asset_id}">Details ansehen</a>
        </li>
      `)
      .join("");

    app.innerHTML = `
      <h1>FINTRUST Radar</h1>
      <ul style="list-style:none; padding:0;">
        ${items}
      </ul>
    `;
  }

  // -------- Detailseite (NUR ECHTE EVENTS) --------
  function renderRadarDetail(assetId) {
    const events = radar
      .filter(e => e.asset_id === assetId)
      .sort((a, b) => new Date(b.detected_at) - new Date(a.detected_at));

    // ❌ KEIN EVENT → KEINE DETAILSEITE
    if (!events.length) {
      app.innerHTML = `
        <h1>FINTRUST Radar</h1>
        <p>Für dieses Asset liegen aktuell keine aktiven Radar-Warnungen vor.</p>
        <p><a href="#/radar">← Zurück zum Radar</a></p>
      `;
      return;
    }

    // ✅ ECHTES EVENT
    const e = events[0];
    const time = new Date(e.detected_at).toLocaleString("de-CH");

    app.innerHTML = `
      <h1>Radar · ${e.asset_id}</h1>

      <div class="card">
        <p><strong>Kategorie:</strong> ${e.category}</p>
        <p><strong>Schweregrad:</strong> ${e.severity}</p>
        <p><strong>Zeitpunkt:</strong> ${time}</p>
        <p>${e.message}</p>
      </div>

      <div class="card locked">
        <h2>🔒 Vertiefte Analyse</h2>
        <p class="muted">
          Diese weiterführende Einordnung ist für LIG1-Teilnehmer freigeschaltet.
        </p>

        <ul class="locked-list">
          <li>🔒 Ursachen & Marktmechanik</li>
          <li>🔒 Risikoeinschätzung</li>
          <li>🔒 Vergleich mit früheren Ereignissen</li>
        </ul>
      </div>

      <p><a href="#/radar">← Zurück zum Radar</a></p>
    `;
  }
})();
