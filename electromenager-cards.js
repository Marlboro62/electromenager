/*
 * Cartes Électroménager pour Home Assistant, au style des cartes MyElectricalData new et des
 * Cartes Serveur HA.
 *
 *   custom:electromenager-robot-card   aspirateur robot : état, batterie, commandes, puissance
 *                                      d'aspiration, carte du logement, nettoyage par pièce,
 *                                      consommables et statistiques
 *
 * Toutes les intégrations d'aspirateur (entités vacuum) : Roborock, Dreame, Ecovacs, Xiaomi,
 * iRobot, Valetudo… Les entités de l'appareil sont trouvées automatiquement (voir le README).
 */

(() => {
const CARD_VERSION = "0.1.0-beta.6";

/* ------------------------------------------------------------- affichage */

const fmt = (n, digits = 0) =>
  n === null || n === undefined || !Number.isFinite(Number(n))
    ? "—"
    : Number(n).toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const themeClass = (theme, hass) => {
  const light = hass?.themes?.darkMode === false;
  if (theme === "ha") return `th-ha${light ? " light" : ""}`;
  if (theme === "auto") return `th-v2${light ? " light" : ""}`;
  return "th-v2";
};
/** Durée en secondes → « 2 h 05 min », « 12 min », « 3 j 4 h ». */
const dur = (s) => {
  if (s === null || !Number.isFinite(s) || s < 0) return null;
  const m = Math.round(s / 60), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mn = m % 60;
  return d ? `${d} j ${h} h` : h ? `${h} h ${String(mn).padStart(2, "0")} min` : `${mn} min`;
};
/** « 496h 34m 42s » (Moonraker) → secondes. */
const parseHms = (v) => {
  const m = /(?:(\d+)\s*d)?\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/i.exec(String(v || "").trim());
  if (!m || !m[0].trim()) return null;
  return (Number(m[1] || 0) * 86400) + (Number(m[2] || 0) * 3600) + (Number(m[3] || 0) * 60) + Number(m[4] || 0);
};
const hm = (d) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const when = (d) => (d.toDateString() === new Date().toDateString() ? hm(d)
  : `${d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })} ${hm(d)}`);

/* ------------------------------------------------------------------ style */

const STYLE = `<style>
:host {
  --med-bg: #1a2434; --med-surface: #212d40; --med-line: #2f3d55;
  --med-text: #e7edf5; --med-muted: #8fa0b8;
  --med-green: #96d21f; --med-blue: #1d93e3; --t-red: #ee4a4a; --med-down: #5fcf8a; --pc-warn: #f0a33a; --pc-hot: #f08a4b; --pc-light: #f7c948;
}
ha-card { display: block; background: var(--med-bg); color: var(--med-text); border: 1px solid var(--med-line); border-radius: 18px; overflow: hidden;
  padding-bottom: 12px; font-variant-numeric: tabular-nums; container-type: inline-size; }
ha-card.pc-alert { border-color: var(--t-red); }
header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px 8px; }
.brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
.pc-icon { --mdc-icon-size: 34px; width: 34px; height: 34px; flex: none; }
.title { font-size: 1.15rem; font-weight: 700; }
.sub { font-size: .78rem; color: var(--med-muted); }
.pc-tabs { display: flex; gap: 6px; padding: 2px 12px 0; overflow-x: auto; scrollbar-width: none; }
.pc-tab { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; white-space: nowrap;
  border: 1px solid var(--med-line); background: var(--med-surface); font-size: .82rem; font-weight: 600; }
.pc-tab small { color: var(--med-muted); font-weight: 500; }
.pc-tab.on { border-color: var(--med-blue); box-shadow: inset 0 -2px 0 var(--med-blue); }
.pc-tab:focus-visible { outline: 2px solid var(--med-blue); }
.pc-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; background: var(--med-muted); flex: none; }
.pc-dot.ok { background: var(--med-down); } .pc-dot.print { background: var(--med-blue); } .pc-dot.warn { background: var(--pc-warn); } .pc-dot.bad { background: var(--t-red); }
.pc-sec { margin: 12px 12px 0; }
.pc-h { display: flex; align-items: center; gap: 6px; font-size: .86rem; font-weight: 600; margin: 0 2px 8px; }
.pc-h ha-icon { --mdc-icon-size: 18px; color: var(--med-blue); }
.pc-state { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--med-line); background: var(--med-surface); cursor: pointer; }
.pc-state ha-icon { --mdc-icon-size: 26px; color: var(--med-muted); flex: none; }
.pc-state div { display: grid; min-width: 0; }
.pc-state b { font-size: .95rem; }
.pc-state span { font-size: .76rem; color: var(--med-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc-state.ok ha-icon, .pc-state.ok b { color: var(--med-down); }
.pc-state.print { border-color: color-mix(in srgb, var(--med-blue) 55%, transparent); background: color-mix(in srgb, var(--med-blue) 10%, var(--med-surface)); }
.pc-state.print ha-icon, .pc-state.print b { color: var(--med-blue); }
.pc-state.warn { border-color: var(--pc-warn); } .pc-state.warn ha-icon, .pc-state.warn b { color: var(--pc-warn); }
.pc-state.bad { border-color: var(--t-red); background: color-mix(in srgb, var(--t-red) 12%, var(--med-surface)); } .pc-state.bad ha-icon, .pc-state.bad b { color: var(--t-red); }
.pc-job { display: flex; gap: 12px; padding: 10px; border-radius: 12px; border: 1px solid var(--med-line); background: var(--med-surface); cursor: pointer; }
.pc-thumb { width: 92px; height: 92px; border-radius: 10px; object-fit: contain; background: color-mix(in srgb, var(--med-text) 6%, transparent); flex: none; }
.pc-thumb.none { display: flex; align-items: center; justify-content: center; } .pc-thumb.none ha-icon { --mdc-icon-size: 40px; color: var(--med-muted); }
.pc-jb { flex: 1; min-width: 0; display: grid; gap: 6px; align-content: start; }
.pc-file { font-weight: 700; font-size: .9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc-prog { display: flex; align-items: center; gap: 8px; }
.pc-prog b { font-size: 1.05rem; white-space: nowrap; }
.pc-bar { flex: 1; height: 9px; border-radius: 6px; background: var(--med-line); overflow: hidden; }
.pc-bar i { display: block; height: 100%; border-radius: 6px; background: linear-gradient(90deg, var(--med-blue), var(--med-green)); }
.pc-bar.warn i { background: var(--pc-warn); } .pc-bar.bad i { background: var(--t-red); } .pc-bar.ok i { background: var(--med-down); }
.pc-kvs { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 2px 12px; }
.pc-kv { display: flex; justify-content: space-between; gap: 6px; font-size: .76rem; color: var(--med-muted); }
.pc-kv b { color: var(--med-text); font-weight: 600; white-space: nowrap; }
.pc-camw { border-radius: 12px; overflow: hidden; border: 1px solid var(--med-line); background: #000; cursor: pointer; }
.pc-cam { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
.pc-ts { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
.pc-t { padding: 10px 12px; border-radius: 12px; border: 1px solid var(--med-line); background: var(--med-surface); cursor: pointer; }
.pc-tt { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: .82rem; }
.pc-tt span { display: inline-flex; align-items: center; gap: 6px; color: var(--med-muted); }
.pc-tt ha-icon { --mdc-icon-size: 18px; color: var(--med-muted); }
.pc-t.hot .pc-tt ha-icon { color: var(--pc-hot); }
.pc-tt b { font-size: 1.15rem; } .pc-tt small { font-size: .74rem; color: var(--med-muted); font-weight: 500; }
.pc-tbar { height: 6px; border-radius: 6px; background: var(--med-line); margin: 8px 0 4px; overflow: hidden; }
.pc-tbar i { display: block; height: 100%; background: linear-gradient(90deg, #f7c948, var(--pc-hot)); border-radius: 6px; }
.pc-tn { font-size: .72rem; color: var(--med-muted); }
.pc-xs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.pc-x { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--med-line); font-size: .74rem; color: var(--med-muted); cursor: pointer; }
.pc-x ha-icon { --mdc-icon-size: 15px; } .pc-x b { color: var(--med-text); }
.pc-btns { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 6px; }
.pc-btn { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 40px; padding: 6px 10px;
  border-radius: 12px; border: 1px solid var(--med-line); background: var(--med-surface); font-size: .8rem; font-weight: 600; text-align: center; }
.pc-btn ha-icon { --mdc-icon-size: 18px; flex: none; }
.pc-btn span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pc-outs { margin-top: 6px; }
.pc-btn:hover { border-color: var(--med-blue); } .pc-btn:focus-visible { outline: 2px solid var(--med-blue); }
.pc-btn.go { color: var(--med-down); border-color: color-mix(in srgb, var(--med-down) 45%, transparent); }
.pc-btn.warn { color: var(--pc-warn); border-color: color-mix(in srgb, var(--pc-warn) 45%, transparent); }
.pc-btn.bad { color: var(--t-red); border-color: color-mix(in srgb, var(--t-red) 40%, transparent); }
.pc-btn.tog.on { color: var(--pc-light); border-color: color-mix(in srgb, var(--pc-light) 45%, transparent); background: color-mix(in srgb, var(--pc-light) 10%, var(--med-surface)); }
.pc-btn.armed { color: var(--pc-warn); border-color: var(--pc-warn); background: color-mix(in srgb, var(--pc-warn) 18%, transparent); animation: pc-pulse 1s ease-in-out infinite; }
@keyframes pc-pulse { 50% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--pc-warn) 30%, transparent); } }
.pc-ss { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 6px; }
.pc-s { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 6px; border-radius: 12px; border: 1px solid var(--med-line); cursor: pointer; text-align: center; }
.pc-s ha-icon { --mdc-icon-size: 18px; color: var(--med-blue); } .pc-s b { font-size: .95rem; } .pc-s span { font-size: .72rem; color: var(--med-muted); }
a.po-link { text-decoration: none; color: var(--med-muted); }
a.po-link:hover { border-color: var(--med-blue); } a.po-link:focus-visible { outline: 2px solid var(--med-blue); }
.po-ext { --mdc-icon-size: 13px !important; opacity: .7; }
.pc-x.po-upd { color: var(--pc-warn); border-color: color-mix(in srgb, var(--pc-warn) 50%, transparent); }
.pc-x.po-upd b { color: var(--pc-warn); }
.empty { padding: 18px; display: flex; flex-direction: column; gap: 6px; font-size: .9rem; } .empty span { color: var(--med-muted); }
ha-card.th-ha {
  --med-bg: var(--ha-card-background, var(--card-background-color, #fff));
  --med-surface: color-mix(in srgb, var(--primary-text-color, #000) 5%, transparent);
  --med-line: var(--divider-color, rgba(127, 127, 127, .25));
  --med-text: var(--primary-text-color, #1f2937); --med-muted: var(--secondary-text-color, #6b7280);
  border-radius: var(--ha-card-border-radius, 12px);
  border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
}
ha-card.th-ha.light, ha-card.th-v2.light { --med-down: #1d8a4b; --med-green: #4c8a0b; --pc-warn: #b0640a; --pc-light: #8a6500; --t-red: #c62f2f; }
ha-card.th-v2.light { --med-bg: #ffffff; --med-surface: #f2f5f9; --med-line: #dbe2ec; --med-text: #1a2434; --med-muted: #5b6b82; --med-blue: #1673b8;
  box-shadow: 0 1px 3px rgba(26, 36, 52, .08); }
@media (prefers-reduced-motion: reduce) { .pc-btn.armed { animation: none; } }
@container (max-width: 360px) { .pc-job { flex-direction: column; } .pc-thumb { width: 100%; height: 140px; } }
</style>`;

/* ----------------------------------------------------------------- éditeur */

const THEME_SELECT = {
  name: "theme",
  selector: {
    select: {
      mode: "dropdown",
      options: [
        { value: "v2", label: "Style MyElectricalData (bleu nuit)" },
        { value: "auto", label: "Style MyElectricalData, clair ou sombre selon Home Assistant" },
        { value: "ha", label: "Thème Home Assistant (clair ou sombre)" },
      ],
    },
  },
};

/** Éditeur visuel : formulaire Home Assistant construit à partir du schéma. */
function makeEditor(schema, labels, defaults) {
  const hasDays = schema.some((s) => s.name === "days");
  return class extends HTMLElement {
    setConfig(config) {
      this._config = { ...config };
      this._draw();
    }

    set hass(hass) {
      this._hass = hass;
      if (this._form) this._form.hass = hass;
      else this._draw();
    }

    _draw() {
      if (!this._hass || !this._config) return;
      if (!this._form) {
        this._form = document.createElement("ha-form");
        this._form.computeLabel = (s) => labels[s.name] || s.name;
        this._form.addEventListener("value-changed", (ev) => {
          const v = { ...ev.detail.value };
          if (hasDays && v.days !== undefined) v.days = Number(v.days);
          this._config = v;
          this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: v }, bubbles: true, composed: true }));
        });
        this.appendChild(this._form);
      }
      this._form.hass = this._hass;
      this._form.schema = schema;
      this._form.data = hasDays
        ? { ...defaults, ...this._config, days: String(this._config.days || defaults.days) }
        : { ...defaults, ...this._config };
    }
  };
}


/* ------------------------------------------------------- aspirateur robot */

/** Fonctions de l'entité vacuum (VacuumEntityFeature). */
const VF = { PAUSE: 4, STOP: 8, RETURN: 16, FAN: 32, LOCATE: 512, SPOT: 1024, START: 8192 };
/** État de l'aspirateur : libellé, icône, classe. */
const RB_STATE = {
  cleaning: ["Nettoyage en cours", "mdi:robot-vacuum", "print"],
  returning: ["Retour à la base", "mdi:home-import-outline", "print"],
  paused: ["En pause", "mdi:pause-circle-outline", "warn"],
  docked: ["Sur sa base", "mdi:home-battery-outline", "ok"],
  idle: ["À l'arrêt", "mdi:robot-vacuum-variant", "ok"],
  error: ["Erreur", "mdi:robot-vacuum-alert", "bad"],
  offline: ["Hors ligne", "mdi:lan-disconnect", "off"],
};
const rbNorm = (s) => {
  const t = String(s ?? "").toLowerCase();
  if (!t || t === "unavailable" || t === "unknown") return "offline";
  if (/clean|segment|zone|spot|mopping|washing|room/.test(t)) return "cleaning";
  if (/return|going_home|back/.test(t)) return "returning";
  if (/pause/.test(t)) return "paused";
  if (/dock|charg|emptying|drying/.test(t)) return "docked";
  if (/error|stuck/.test(t)) return "error";
  return "idle";
};
/** Messages d'état des intégrations (Roborock, Dreame, Ecovacs…) traduits quand c'est possible. */
const RB_STATUS = [
  [/charging_completed|charge_complete|full/, "Batterie pleine"], [/charging|charg/, "En charge"],
  [/emptying|dust_collect|auto_empty|evacuat/, "Vidage du bac"], [/washing.*mop|mop.*wash/, "Lavage des serpillières"],
  [/drying/, "Séchage des serpillières"], [/segment|room/, "Nettoyage par pièce"], [/zone/, "Nettoyage de zone"],
  [/spot/, "Nettoyage ciblé"], [/mopping/, "Lavage du sol"], [/going_to_target|go_to/, "Déplacement"],
  [/returning|going_home|back_to_dock/, "Retour à la base"], [/updating|upgrade|ota/, "Mise à jour"],
  [/sleep/, "En veille"], [/idle|waiting|standby/, "En attente"], [/paused/, "En pause"], [/cleaning/, "Nettoyage"],
];
const rbStatus = (s) => {
  const t = String(s ?? "").toLowerCase().replace(/\s+/g, "_");
  if (!t || /^(unknown|unavailable|none|ok)$/.test(t)) return null;
  const m = RB_STATUS.find(([re]) => re.test(t));
  return m ? m[1] : String(s).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
};
/** Puissances d'aspiration courantes, en français. */
const FAN_FR = {
  off: "Arrêt", silent: "Silencieux", quiet: "Silencieux", gentle: "Doux", eco: "Éco", low: "Faible", standard: "Standard",
  balanced: "Équilibré", normal: "Normal", medium: "Moyen", strong: "Fort", high: "Fort", turbo: "Turbo", max: "Max", max_plus: "Max+",
  maxplus: "Max+", custom: "Personnalisé", smart: "Intelligent", auto: "Auto",
  // modes et réglages courants (Dreame, Roborock, Ecovacs…)
  sweeping: "Balayage", mopping: "Lavage", sweeping_and_mopping: "Balayage et lavage", mopping_after_sweeping: "Lavage après balayage",
  vacuum: "Aspiration", vacuum_and_mop: "Aspiration et lavage", mop: "Lavage", vacuuming: "Aspiration",
  slightly_dry: "Légèrement sec", moist: "Humide", wet: "Mouillé", dry: "Sec",
  quick: "Rapide", deep: "Approfondi", deep_plus: "Approfondi+", fast: "Rapide",
  medium_high: "Moyen-élevé", very_high: "Très élevé", ultra: "Ultra", none: "Aucun", on: "Activé",
};
const fanFr = (f) => FAN_FR[String(f).toLowerCase().replace(/[\s-]+/g, "_")] || String(f).replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
/** Consommables : mot-clé, libellé, icône. */
const CONSUMABLES = [
  [/main_brush|brosse_principale|roller_brush|rolling_brush/, "Brosse principale", "mdi:brush"],
  [/side_brush|brosse_laterale/, "Brosse latérale", "mdi:brush-variant"],
  [/filter|filtre/, "Filtre", "mdi:air-filter"],
  [/sensor|capteur|sensor_dirty/, "Capteurs", "mdi:eye-outline"],
  [/mop|serpill|pad|lingette/, "Serpillière", "mdi:water-outline"],
  [/dust_bag|sac/, "Sac à poussière", "mdi:delete-outline"],
  [/strainer|detergent|cleaning_solution|cleaning_fluid/, "Produit nettoyant", "mdi:spray-bottle"],
  [/silver_ion|ion/, "Module ions argent", "mdi:shield-sun-outline"],
];
/** Statistiques : mot-clé, libellé, icône, type. */
const RB_STATS = [
  [/(total|cumul)[a-z_]*(area|surface)/, "Surface totale", "mdi:texture-box", "area"],
  [/(total|cumul)[a-z_]*(time|duration|duree)/, "Temps total", "mdi:timer-outline", "dur"],
  [/(total|cumul)?[a-z_]*(clean(ing)?_count|count|nombre)/, "Nettoyages", "mdi:counter", "num"],
  [/(area|surface)/, "Dernière surface", "mdi:texture-box", "area"],
  [/(clean(ing)?_time|duration|duree|cleaning_duration)/, "Dernière durée", "mdi:timer-sand", "dur"],
  [/last_clean_(end|start)|last_cleaning|dernier/, "Dernier nettoyage", "mdi:calendar-check", "date"],
];
/** Point dans un polygone (lancer de rayon). */
const inPoly = (x, y, pts) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const toSecs = (v, unit) => {
  if (v === null || !Number.isFinite(v)) return null;
  const u = String(unit || "s").toLowerCase();
  return v * (u === "d" ? 86400 : u === "h" ? 3600 : u === "min" ? 60 : u === "ms" ? 0.001 : 1);
};

const RB_DEFAULTS = {
  title: "",
  icon: "mdi:robot-vacuum",
  icon_color: "",
  show_map: true, show_rooms: true, show_controls: true, show_consumables: true, show_stats: true,
  expanded: ["map"], // sections dépliées au départ : settings, map, rooms, consumables, stats
  theme: "v2",
};

class RobotCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("electromenager-robot-card-editor");
  }

  static getStubConfig() {
    return {};
  }

  setConfig(config) {
    this._config = { ...RB_DEFAULTS, ...(config || {}) };
    this._map = null;
    this._sig = null;
    this._sel ||= {};
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    if (!this._clicks) {
      this.shadowRoot.addEventListener("click", (this._clicks = (ev) => this._onClick(ev)));
      this.shadowRoot.addEventListener("change", (ev) => {
        const sel = ev.target.closest?.("[data-select]");
        if (sel) this._hass?.callService("select", "select_option", { entity_id: sel.dataset.select, option: sel.value });
      });
    }
    this._render();
  }

  set hass(hass) {
    if (this._hass?.entities !== hass.entities || this._hass?.devices !== hass.devices) this._map = null;
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 8;
  }

  _st(id) {
    return id ? this._hass?.states?.[id] : undefined;
  }

  _num(id) {
    const s = this._st(id);
    if (!s || s.state === "unavailable" || s.state === "unknown" || s.state === "") return null;
    const v = Number(s.state);
    return Number.isFinite(v) ? v : null;
  }

  /** Robots et entités de leur appareil, rangées par rôle. */
  _resolve() {
    if (this._map) return this._map;
    const hass = this._hass, c = this._config, reg = hass.entities || {};
    const want = (Array.isArray(c.robots) ? c.robots : c.robots ? [c.robots] : []).map((x) => (typeof x === "object" ? x : { entity: x }));
    const ids = want.length ? want.map((w) => w.entity).filter((id) => hass.states[id])
      : Object.keys(hass.states).filter((id) => id.startsWith("vacuum.") && !reg[id]?.hidden).sort();
    const list = ids.map((vac) => {
      const w = want.find((x) => x.entity === vac) || {};
      const dev = reg[vac]?.device_id;
      const mine = dev ? Object.keys(reg).filter((id) => reg[id].device_id === dev && id !== vac && !reg[id].hidden && hass.states[id]) : [];
      const r = { vac, dev, platform: reg[vac]?.platform, name: w.name || null, battery: null, status: null, error: null, dock: null,
        map: w.map || null, cons: [], resets: [], stats: [], selects: [], roomsCfg: w.rooms || c.rooms || null };
      const obj = (id) => id.split(".")[1];
      for (const id of mine) {
        const dom = id.split(".")[0], o = obj(id), a = hass.states[id].attributes || {};
        if (dom === "sensor") {
          if (!r.battery && (a.device_class === "battery" || /_battery(_level)?$|_batterie$/.test(o))) { r.battery = id; continue; }
          if (/(vacuum_)?error$|erreur$/.test(o) && !/dock/.test(o)) { r.error ||= id; continue; }
          if (/dock.*(status|error|state)|station/.test(o)) { r.dock ||= id; continue; }
          if (/_(status|statut|state|etat)$/.test(o) && !Number.isFinite(Number(hass.states[id].state))) { r.status ||= id; continue; }
          const cons = CONSUMABLES.find(([re]) => re.test(o));
          if (cons && (a.unit_of_measurement === "%" || a.device_class === "duration" || /^(h|min|s|d)$/.test(a.unit_of_measurement || ""))
            && /(left|remaining|life|restant|time|percent|lifespan|_level)/.test(o)) { r.cons.push({ id, cons }); continue; }
          const st = RB_STATS.find(([re]) => re.test(o));
          if (st) { if (!r.stats.some((x) => x.st[1] === st[1])) r.stats.push({ id, st }); continue; }
        } else if (dom === "button" && /reset|reinit/.test(o)) r.resets.push(id);
        else if (dom === "select") {
          // Dreame & co créent un réglage par pièce (aspiration, serpillière…) et un choix de carte : ignorés
          const fn = String(hass.states[id].attributes?.friendly_name || "");
          if (!/room_?\d|_piece_|segment|selected_map|map_|carte|_floor/.test(o) && !/\b(chambre|couloir|cuisine|salon|salle|bureau|entrée|room)\b/i.test(fn.replace(/^\S+\s/, ""))) r.selects.push(id);
        }
        else if ((dom === "image" || dom === "camera") && !w.map) {
          if (!r.map || /map|carte/.test(o)) r.map = id;
        }
      }
      // un consommable : la valeur en % d'abord, la durée restante en second
      const byName = {};
      for (const x of r.cons) {
        const k = x.cons[1], a = hass.states[x.id].attributes || {};
        const e = (byName[k] ||= { label: k, icon: x.cons[2], pct: null, time: null, reset: null });
        if (a.unit_of_measurement === "%") e.pct ||= x.id; else e.time ||= x.id;
      }
      for (const e of Object.values(byName)) {
        const re = CONSUMABLES.find(([, l]) => l === e.label)[0];
        e.reset = r.resets.find((b) => re.test(obj(b))) || null;
      }
      r.consumables = Object.values(byName);
      const d = hass.devices?.[dev] || {};
      r.devName = d.name_by_user || d.name || hass.states[vac].attributes?.friendly_name || "Aspirateur";
      r.name ||= r.devName;
      r.model = [d.manufacturer, d.model].filter(Boolean).join(" ");
      return r;
    });
    this._map = list;
    return list;
  }

  _status(r) {
    const s = this._st(r.vac);
    if (!s) return "offline";
    const err = this._st(r.error)?.state;
    if (err && !/^(none|ok|no_error|0|unknown|unavailable|aucune)$/i.test(err)) return "error";
    return rbNorm(s.state);
  }

  /** Pièces : configurées (rooms), sinon lues sur l'aspirateur (Dreame…) ou demandées à Roborock. */
  _rooms(r) {
    if (Array.isArray(r.roomsCfg)) return r.roomsCfg.map((x, i) => ({ id: x.id ?? x.segment ?? x.segments ?? i, name: x.name || `Pièce ${i + 1}`, icon: x.icon, service: x.service, data: x.data }));
    const a = this._st(r.vac)?.attributes || {};
    let rooms = a.rooms;
    if (rooms && !Array.isArray(rooms) && typeof rooms === "object") {
      const vals = Object.values(rooms);
      if (vals.every(Array.isArray)) {
        // une liste par carte : celle de la carte en cours (selected_map), sinon la première
        const cur = a.selected_map != null ? rooms[a.selected_map] : null;
        rooms = cur || vals[0] || [];
      } else rooms = Object.entries(rooms).map(([id, v]) => (typeof v === "object" ? { id, ...v } : { id, name: v }));
    }
    if (Array.isArray(rooms) && rooms.length) return rooms.filter((x) => x && typeof x === "object").map((x) => ({ id: x.id ?? x.segment_id ?? x.room_id, name: x.name || x.custom_name || `Pièce ${x.id}`, icon: x.icon }));
    if (r.platform === "roborock" && this._hass?.callService) {
      this._rbRooms ||= {};
      if (this._rbRooms[r.vac] === undefined) {
        this._rbRooms[r.vac] = null;
        Promise.resolve(this._hass.callService("roborock", "get_maps", {}, { entity_id: r.vac }, false, true)).then((res) => {
          const maps = res?.response?.[r.vac]?.maps || [];
          const m = maps.find((x) => x.flag === 0) || maps[0];
          this._rbRooms[r.vac] = m?.rooms ? Object.entries(m.rooms).map(([id, name]) => ({ id: Number(id), name })) : [];
          this._sig = null;
          this._render();
        }).catch(() => { this._rbRooms[r.vac] = []; });
      }
      return this._rbRooms[r.vac] || [];
    }
    return [];
  }

  /** Lance le nettoyage des pièces choisies, avec le service de l'intégration. */
  _cleanRooms(r, rooms) {
    const ids = rooms.map((x) => x.id).flat().map((x) => (Number.isFinite(Number(x)) ? Number(x) : x));
    const custom = rooms.find((x) => x.service);
    if (custom) {
      for (const x of rooms) {
        const [d, s] = String(x.service).split(".");
        this._hass.callService(d, s, { entity_id: r.vac, ...(x.data || {}) });
      }
      return;
    }
    const p = r.platform;
    if (p === "dreame_vacuum") this._hass.callService("dreame_vacuum", "vacuum_clean_segment", { entity_id: r.vac, segments: ids });
    else if (p === "xiaomi_miio") this._hass.callService("xiaomi_miio", "vacuum_clean_segment", { entity_id: r.vac, segments: ids });
    else if (p === "ecovacs") this._hass.callService("vacuum", "send_command", { entity_id: r.vac, command: "spot_area", params: { rooms: ids.join(","), cleanings: 1 } });
    else this._hass.callService("vacuum", "send_command", { entity_id: r.vac, command: "app_segment_clean", params: [{ segments: ids, repeat: 1 }] });
  }

  _onClick(ev) {
    const t = ev.target;
    const fold = t.closest?.("[data-fold]");
    if (fold) {
      this._open[fold.dataset.fold] = !this._open[fold.dataset.fold];
      try { localStorage.setItem("electromenager-robot:open", JSON.stringify(this._open)); } catch (e) { /* stockage indisponible */ }
      this._sig = null; this._render(); return;
    }
    const tab = t.closest?.("[data-tab]");
    if (tab) {
      this._tab = tab.dataset.tab;
      try { localStorage.setItem("electromenager-robot:tab", JSON.stringify(this._tab)); } catch (e) { /* stockage indisponible */ }
      this._sig = null; this._render(); return;
    }
    const list = this._resolve();
    const r = list.find((x) => x.vac === this._cur) || list[0];
    const act = t.closest?.("[data-act]");
    if (act && r) {
      const a = act.dataset.act;
      if (a === "fan") this._hass.callService("vacuum", "set_fan_speed", { entity_id: r.vac, fan_speed: act.dataset.v });
      else if (a === "mode") { (this._mode ||= {})[r.vac] = act.dataset.v; }
      else if (a === "zclear") { if (this._zone) delete this._zone[r.vac]; if (this._pt) delete this._pt[r.vac]; }
      else if (a === "zone" && this._zone?.[r.vac]) {
        const [[x1, y1], [x2, y2]] = this._zone[r.vac];
        const z = [Math.round(Math.min(x1, x2)), Math.round(Math.min(y1, y2)), Math.round(Math.max(x1, x2)), Math.round(Math.max(y1, y2))];
        if (r.platform === "dreame_vacuum") this._hass.callService("dreame_vacuum", "vacuum_clean_zone", { entity_id: r.vac, zone: z, repeats: 1 });
        else if (r.platform === "xiaomi_miio") this._hass.callService("xiaomi_miio", "vacuum_clean_zone", { entity_id: r.vac, zone: [z], repeats: 1 });
        else this._hass.callService("vacuum", "send_command", { entity_id: r.vac, command: "app_zoned_clean", params: [[...z, 1]] });
        delete this._zone[r.vac];
      } else if (a === "goto" && this._pt?.[r.vac]) {
        const [x, y] = this._pt[r.vac].map(Math.round);
        if (r.platform === "dreame_vacuum") this._hass.callService("dreame_vacuum", "vacuum_goto", { entity_id: r.vac, x, y });
        else if (r.platform === "xiaomi_miio") this._hass.callService("xiaomi_miio", "vacuum_goto", { entity_id: r.vac, x_coord: x, y_coord: y });
        else this._hass.callService("vacuum", "send_command", { entity_id: r.vac, command: "app_goto_target", params: [x, y] });
        delete this._pt[r.vac];
      }
      else if (a === "rooms") {
        const sel = this._rooms(r).filter((x) => (this._sel[r.vac] || []).includes(String(x.id)));
        if (sel.length) { this._cleanRooms(r, sel); this._sel[r.vac] = []; }
      } else if (a === "reset") {
        // remise à zéro d'un consommable : premier clic arme, second dans les 5 s confirme
        const key = `reset:${act.dataset.v}`;
        if (this._armed !== key) {
          this._armed = key;
          clearTimeout(this._armTimer);
          this._armTimer = setTimeout(() => { this._armed = null; this._sig = null; this._render(); }, 5000);
        } else { this._armed = null; this._hass.callService("button", "press", { entity_id: act.dataset.v }); }
      } else this._hass.callService("vacuum", a, { entity_id: r.vac });
      this._sig = null; this._render(); return;
    }
    const room = t.closest?.("[data-room]");
    if (room && r) {
      const cur = new Set(this._sel[r.vac] || []);
      cur.has(room.dataset.room) ? cur.delete(room.dataset.room) : cur.add(room.dataset.room);
      this._sel[r.vac] = [...cur];
      this._sig = null; this._render(); return;
    }
    const el = t.closest?.("[data-entity]");
    if (el?.dataset.entity) {
      const e = new Event("hass-more-info", { bubbles: true, composed: true });
      e.detail = { entityId: el.dataset.entity };
      this.dispatchEvent(e);
    }
  }

  /** Section repliable : en-tête cliquable avec résumé, contenu affiché seulement si dépliée. */
  _fold(key, icon, title, summary, body) {
    if (!this._open) {
      try { this._open = JSON.parse(localStorage.getItem("electromenager-robot:open") || "null"); } catch (e) { this._open = null; }
      const def = Array.isArray(this._config.expanded) ? this._config.expanded : ["map"];
      this._open ||= Object.fromEntries(["settings", "map", "rooms", "consumables", "stats"].map((k) => [k, def.includes(k)]));
    }
    const open = !!this._open[key];
    return `<div class="pc-sec rb-fold ${open ? "open" : ""}"><button class="pc-h rb-fh" data-fold="${key}" aria-expanded="${open}"><ha-icon icon="${icon}"></ha-icon>${title}
      ${!open && summary ? `<span class="rb-fs">${summary}</span>` : ""}<ha-icon class="rb-chev" icon="mdi:chevron-down"></ha-icon></button>${open ? body : ""}</div>`;
  }

  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) return;
    const c = this._config, list = this._resolve();
    if (this._tab === undefined) { try { this._tab = JSON.parse(localStorage.getItem("electromenager-robot:tab") || "null"); } catch (e) { this._tab = null; } }
    const r = list.find((x) => x.vac === this._tab) || list.find((x) => ["cleaning", "returning", "paused", "error"].includes(this._status(x))) || list[0];
    this._cur = r?.vac;
    const ids = list.flatMap((x) => [x.vac, x.battery, x.status, x.error, x.dock, x.map, ...x.selects, ...x.stats.map((s) => s.id),
      ...x.consumables.flatMap((e) => [e.pct, e.time])]).filter(Boolean);
    const sig = `${c.theme}|${this._hass.themes?.darkMode}|${r?.vac}|${this._armed}|${JSON.stringify(this._sel)}|${JSON.stringify(this._open)}|${JSON.stringify(this._rbRooms || {})}|${Math.floor(Date.now() / 60000)}|`
      + ids.map((id) => this._st(id)?.state ?? "-").join("|") + JSON.stringify(this._st(r?.vac)?.attributes || {}) + (this._st(r?.map)?.attributes?.entity_picture || "");
    if (sig === this._sig) return;
    this._sig = sig;

    const statuses = list.map((x) => this._status(x));
    let body = "";
    if (!r) {
      body = `<div class="empty">Aucun aspirateur robot trouvé<span>Ajoutez l'intégration de votre robot (Roborock, Dreame, Ecovacs, Xiaomi, iRobot…) : la carte affiche toutes les entités vacuum.</span></div>`;
    } else {
      const s = this._st(r.vac), a = s?.attributes || {}, status = this._status(r), feat = Number(a.supported_features) || 0;
      const [stLabel, stIcon, stCls] = RB_STATE[status];
      const tabs = list.length > 1 ? `<div class="pc-tabs" role="tablist">${list.map((x, i) => `<button class="pc-tab ${x.vac === r.vac ? "on" : ""}" role="tab" aria-selected="${x.vac === r.vac}" data-tab="${esc(x.vac)}">
          <i class="pc-dot ${RB_STATE[statuses[i]][2]}"></i>${esc(x.name)}</button>`).join("")}</div>` : "";

      // --- état, batterie
      const bat = this._num(r.battery) ?? (Number.isFinite(Number(a.battery_level)) ? Number(a.battery_level) : null);
      const stTxt = `${this._st(r.status)?.state || ""} ${a.status || ""}`;
      const charging = !/complet|full|pleine/i.test(stTxt) && (/charg/i.test(stTxt) || (status === "docked" && bat !== null && bat < 100));
      const errTxt = status === "error" ? rbStatus(this._st(r.error)?.state) : null;
      const msg = errTxt || rbStatus(this._st(r.status)?.state ?? a.status);
      const showMsg = msg && msg.toLowerCase() !== stLabel.toLowerCase();
      const batIcon = bat === null ? "mdi:battery-unknown" : charging ? `mdi:battery-charging${bat >= 95 ? "-100" : bat >= 10 ? `-${Math.max(10, Math.round(bat / 10) * 10)}` : "-outline"}`
        : bat >= 95 ? "mdi:battery" : bat < 10 ? "mdi:battery-alert-variant-outline" : `mdi:battery-${Math.max(10, Math.round(bat / 10) * 10)}`;
      const batCls = bat === null ? "" : bat <= 15 ? "bad" : bat <= 30 ? "warn" : "ok";
      const state = `<div class="rb-top">
        <div class="pc-state ${stCls}" data-entity="${esc(r.vac)}"><ha-icon icon="${stIcon}"></ha-icon>
          <div><b>${stLabel}</b>${showMsg ? `<span>${esc(msg)}</span>` : r.model ? `<span>${esc(r.model)}</span>` : ""}</div></div>
        ${bat !== null ? `<div class="rb-bat ${batCls}" data-entity="${esc(r.battery || r.vac)}"><ha-icon icon="${batIcon}"></ha-icon><b>${fmt(bat)} %</b><span>${charging ? "En charge" : "Batterie"}</span>
          <div class="rb-bbar"><i style="width:${Math.max(0, Math.min(100, bat))}%"></i></div></div>` : ""}
      </div>${r.dock && rbStatus(this._st(r.dock)?.state) ? `<div class="pc-xs"><span class="pc-x" data-entity="${esc(r.dock)}"><ha-icon icon="mdi:home-outline"></ha-icon>Station <b>${esc(rbStatus(this._st(r.dock).state))}</b></span></div>` : ""}`;

      // --- commandes
      const btn = (act, icon, label, cls = "") => `<button class="pc-btn ${cls}" data-act="${act}" title="${esc(label)}"><ha-icon icon="${icon}"></ha-icon><span>${label}</span></button>`;
      const has = (f) => !feat || (feat & f) === f;
      const busy = status === "cleaning" || status === "returning";
      const ctl = c.show_controls === false || status === "offline" ? [] : [
        !busy ? btn("start", "mdi:play", status === "paused" ? "Reprendre" : "Nettoyer", "go") : "",
        busy && has(VF.PAUSE) ? btn("pause", "mdi:pause", "Pause", "warn") : "",
        (busy || status === "paused") && has(VF.STOP) ? btn("stop", "mdi:stop", "Arrêter", "bad") : "",
        status !== "docked" && status !== "returning" && has(VF.RETURN) ? btn("return_to_base", "mdi:home-import-outline", "Retour base") : "",
        feat & VF.SPOT && !busy ? btn("clean_spot", "mdi:target", "Ciblé") : "",
        feat & VF.LOCATE ? btn("locate", "mdi:map-marker-question-outline", "Localiser") : "",
      ].filter(Boolean);
      const fans = Array.isArray(a.fan_speed_list) && a.fan_speed_list.length && (feat & VF.FAN || !feat) && c.show_controls !== false && status !== "offline"
        ? `<div class="rb-fans" role="radiogroup" aria-label="Puissance d'aspiration">${a.fan_speed_list.map((f) => `<button class="rb-chip ${f === a.fan_speed ? "on" : ""}" data-act="fan" data-v="${esc(f)}" role="radio" aria-checked="${f === a.fan_speed}">${esc(fanFr(f))}</button>`).join("")}</div>` : "";
      const name = (id) => String(this._st(id)?.attributes?.friendly_name || id).replace(new RegExp(`^${r.devName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i"), "");
      const selects = c.show_controls === false ? "" : r.selects.map((id) => {
        const st = this._st(id), opts = st?.attributes?.options || [];
        if (!opts.length || st.state === "unavailable") return "";
        return `<label class="rb-sel"><span>${esc(name(id))}</span><select data-select="${esc(id)}">${opts.map((o) => `<option value="${esc(o)}" ${o === st.state ? "selected" : ""}>${esc(fanFr(o))}</option>`).join("")}</select></label>`;
      }).filter(Boolean).join("");
      const setSum = [a.fan_speed ? esc(fanFr(a.fan_speed)) : "", ...r.selects.filter((id) => { const v = this._st(id)?.state; return v && !/^(unavailable|unknown)$/.test(v); }).slice(0, 1).map((id) => esc(fanFr(this._st(id).state)))].filter(Boolean).join(" · ");
      const ctlHtml = (ctl.length ? `<div class="pc-sec"><div class="pc-btns">${ctl.join("")}</div></div>` : "")
        + (fans || selects ? this._fold("settings", "mdi:tune-variant", "Réglages", setSum,
          `${fans ? `<div class="rb-sub">Aspiration</div>${fans}` : ""}${selects ? `<div class="rb-sels">${selects}</div>` : ""}`) : "");

      // --- carte du logement
      const mapSt = this._st(r.map);
      const mapPic = mapSt?.attributes?.entity_picture;
      const mapOn = c.show_map !== false && mapPic && mapSt.state !== "unavailable";
      this._mapSrc = mapOn ? `${mapPic}${r.map.startsWith("camera.") ? `${mapPic.includes("?") ? "&" : "?"}t=${Math.floor(Date.now() / (busy ? 10000 : 60000))}` : ""}` : null;
      const geo = mapOn ? this._geo(r) : null;
      const mode = this._mode?.[r.vac] || "rooms";
      const zone = this._zone?.[r.vac], pt = this._pt?.[r.vac];
      const tools = geo?.cal && status !== "offline" && c.show_controls !== false ? `<div class="rb-modes" role="radiogroup" aria-label="Action sur la carte">
          ${geo.rooms.length ? `<button class="rb-chip ${mode === "rooms" ? "on" : ""}" data-act="mode" data-v="rooms" role="radio" aria-checked="${mode === "rooms"}"><ha-icon icon="mdi:floor-plan"></ha-icon>Pièces</button>` : ""}
          ${this._can(r, "zone") ? `<button class="rb-chip ${mode === "zone" ? "on" : ""}" data-act="mode" data-v="zone" role="radio" aria-checked="${mode === "zone"}"><ha-icon icon="mdi:selection-drag"></ha-icon>Zone</button>` : ""}
          ${this._can(r, "goto") ? `<button class="rb-chip ${mode === "goto" ? "on" : ""}" data-act="mode" data-v="goto" role="radio" aria-checked="${mode === "goto"}"><ha-icon icon="mdi:map-marker-radius-outline"></ha-icon>Aller ici</button>` : ""}
        </div>
        ${mode === "zone" ? `<div class="rb-hint">${zone ? "" : "Tracez un rectangle sur la carte."}</div>${zone ? `<div class="rb-zact"><button class="pc-btn go" data-act="zone"><ha-icon icon="mdi:play"></ha-icon><span>Nettoyer la zone</span></button><button class="pc-btn" data-act="zclear"><ha-icon icon="mdi:close"></ha-icon><span>Effacer</span></button></div>` : ""}` : ""}
        ${mode === "goto" ? `<div class="rb-hint">${pt ? "" : "Touchez un point de la carte."}</div>${pt ? `<div class="rb-zact"><button class="pc-btn go" data-act="goto"><ha-icon icon="mdi:map-marker-right-outline"></ha-icon><span>Aller ici</span></button><button class="pc-btn" data-act="zclear"><ha-icon icon="mdi:close"></ha-icon><span>Effacer</span></button></div>` : ""}` : ""}
        ${mode === "rooms" && geo.rooms.length ? ((this._sel[r.vac] || []).length
          ? `<button class="pc-btn go rb-go" data-act="rooms"><ha-icon icon="mdi:play"></ha-icon><span>Nettoyer ${(this._sel[r.vac] || []).length} pièce${(this._sel[r.vac] || []).length > 1 ? "s" : ""}</span></button>`
          : `<div class="rb-hint">Touchez les pièces à nettoyer sur la carte.</div>`) : ""}` : "";
      const mapHtml = mapOn ? this._fold("map", "mdi:map-outline", "Carte", "", `<div class="rb-mapslot"></div>${tools}`) : "";
      this._mapR = mapOn && this._open?.map ? r : null;

      // --- nettoyage par pièce
      const rooms = c.show_rooms !== false && status !== "offline" ? this._rooms(r) : [];
      const sel = this._sel[r.vac] || [];
      const roomsHtml = rooms.length ? this._fold("rooms", "mdi:floor-plan", "Pièces", sel.length ? `${sel.length} choisie${sel.length > 1 ? "s" : ""}` : `${rooms.length}`, `
        <div class="rb-rooms">${rooms.map((x) => `<button class="rb-chip ${sel.includes(String(x.id)) ? "on" : ""}" data-room="${esc(String(x.id))}" aria-pressed="${sel.includes(String(x.id))}">${x.icon ? `<ha-icon icon="${esc(x.icon)}"></ha-icon>` : ""}${esc(x.name)}</button>`).join("")}</div>
        <button class="pc-btn go rb-go" data-act="rooms" ${sel.length ? "" : "disabled"}><ha-icon icon="mdi:play"></ha-icon><span>${sel.length ? `Nettoyer ${sel.length} pièce${sel.length > 1 ? "s" : ""}` : "Choisissez les pièces"}</span></button>`) : "";

      // --- consommables
      const cons = c.show_consumables !== false ? r.consumables.map((e) => {
        const pct = this._num(e.pct), tSt = this._st(e.time), tv = this._num(e.time);
        const secs = tv === null ? null : toSecs(tv, tSt?.attributes?.unit_of_measurement);
        if (pct === null && secs === null) return "";
        const lv = pct !== null ? (pct <= 10 ? "bad" : pct <= 25 ? "warn" : "ok") : secs !== null ? (secs <= 0 ? "bad" : secs <= 10 * 3600 ? "warn" : "") : null;
        const left = secs === null ? null : secs <= 0 ? "À remplacer" : `${fmt(Math.round(secs / 3600))} h restantes`;
        const armed = this._armed === `reset:${e.reset}`;
        return `<div class="rb-cons ${lv || ""}" data-entity="${esc(e.pct || e.time)}"><ha-icon icon="${e.icon}"></ha-icon>
          <div class="rb-cn"><b>${e.label}</b><span>${left || (pct !== null && pct <= 10 ? "À remplacer" : "")}</span>
          ${pct !== null ? `<div class="pc-bar ${lv}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>` : ""}</div>
          ${pct !== null ? `<b class="rb-cp">${fmt(pct)} %</b>` : ""}
          ${e.reset ? `<button class="rb-reset ${armed ? "armed" : ""}" data-act="reset" data-v="${esc(e.reset)}" title="${armed ? "Remettre à zéro : cliquez encore pour confirmer" : `Remettre à zéro (${e.label} remplacé)`}"><ha-icon icon="${armed ? "mdi:check-bold" : "mdi:restore"}"></ha-icon></button>` : ""}</div>`;
      }).filter(Boolean) : [];
      const worst = r.consumables.map((e) => ({ e, p: this._num(e.pct), h: this._num(e.time) === null ? null : toSecs(this._num(e.time), this._st(e.time)?.attributes?.unit_of_measurement) / 3600 }))
        .map((x) => ({ ...x, k: x.p ?? (x.h === null ? 999 : Math.min(100, x.h)) })).sort((x, y) => x.k - y.k)[0];
      const consSum = !worst ? "" : worst.k <= 25 ? `<b class="${worst.k <= 10 ? "bad" : "warn"}">${esc(worst.e.label)} ${worst.p !== null ? `${fmt(worst.p)} %` : `${fmt(Math.max(0, worst.h))} h`}</b>` : "Tout est en bon état";
      const consHtml = cons.length ? this._fold("consumables", "mdi:tools", "Consommables", consSum, `<div class="rb-conss">${cons.join("")}</div>`) : "";

      // --- statistiques
      const SHOW = ["Dernière surface", "Dernière durée", "Dernier nettoyage", "Surface totale", "Temps total", "Nettoyages"];
      const order = (x) => SHOW.indexOf(x.st[1]);
      const stats = c.show_stats !== false ? [...r.stats].sort((x, y) => order(x) - order(y)).map(({ id, st }) => {
        const S = this._st(id), v = this._num(id), u = S?.attributes?.unit_of_measurement;
        if (v === 0 && /^Dernière/.test(st[1])) return "";
        let txt = null;
        if (st[3] === "area" && v !== null) txt = `${fmt(v, v < 100 ? 1 : 0)} m²`;
        else if (st[3] === "dur" && v !== null) txt = dur(toSecs(v, u));
        else if (st[3] === "num" && v !== null) txt = fmt(v);
        else if (st[3] === "date" && S && !/unknown|unavailable/.test(S.state)) { const d = new Date(S.state); txt = isNaN(d) ? null : when(d); }
        return txt ? `<div class="pc-s" data-entity="${esc(id)}"><ha-icon icon="${st[2]}"></ha-icon><b>${esc(txt)}</b><span>${st[1]}</span></div>` : "";
      }).filter(Boolean) : [];
      const sv = (label) => { const x = r.stats.find((y) => y.st[1] === label); return x ? this._num(x.id) : null; };
      const statSum = [sv("Nettoyages") !== null ? `${fmt(sv("Nettoyages"))} nettoyages` : "", sv("Surface totale") !== null ? `${fmt(sv("Surface totale"))} m²` : ""].filter(Boolean).join(" · ");
      const statsHtml = stats.length ? this._fold("stats", "mdi:chart-box-outline", "Statistiques", statSum, `<div class="pc-ss">${stats.join("")}</div>`) : "";

      body = tabs + `<div class="pc-sec">${state}</div>` + ctlHtml + mapHtml + roomsHtml + consHtml + statsHtml;
    }
    const title = c.title || (list.length === 1 ? list[0].name : "Aspirateurs robots");
    const sub = !list.length ? "" : list.length === 1 ? RB_STATE[statuses[0]][0] : `${list.length} robots · ${statuses.filter((x) => x === "cleaning").length ? "nettoyage en cours" : "au repos"}`;
    this.shadowRoot.innerHTML = `${STYLE}${RB_STYLE}<ha-card class="${themeClass(c.theme, this._hass)} ${statuses.includes("error") ? "pc-alert" : ""}">
      <header><div class="brand"><ha-icon class="pc-icon" icon="${esc(c.icon || "mdi:robot-vacuum")}" style="color:${esc(c.icon_color || "var(--med-blue)")}"></ha-icon>
        <div><div class="title">${esc(title)}</div><div class="sub">${esc(sub)}</div></div></div></header>
      ${body}
    </ha-card>`;
    const slot = this.shadowRoot.querySelector(".rb-mapslot");
    if (slot && this._mapR) { slot.appendChild(this._mapBox(this._mapR)); this._mapDraw(); }
  }

  /* ------------------------------------------------ carte interactive */

  /** Transformation affine (coordonnées du robot → pixels de l'image) à partir de 3 points. */
  static affine(pts) {
    const [p1, p2, p3] = pts;
    const solve = (k) => {
      const [x1, y1, x2, y2, x3, y3] = [p1.vacuum.x, p1.vacuum.y, p2.vacuum.x, p2.vacuum.y, p3.vacuum.x, p3.vacuum.y];
      const d = x1 * (y2 - y3) - y1 * (x2 - x3) + (x2 * y3 - x3 * y2);
      if (!d) return null;
      const [m1, m2, m3] = [p1.map[k], p2.map[k], p3.map[k]];
      return [(m1 * (y2 - y3) - y1 * (m2 - m3) + (m2 * y3 - m3 * y2)) / d,
        (x1 * (m2 - m3) - m1 * (x2 - x3) + (x2 * m3 - x3 * m2)) / d,
        (x1 * (y2 * m3 - y3 * m2) - y1 * (x2 * m3 - x3 * m2) + m1 * (x2 * y3 - x3 * y2)) / d];
    };
    const X = solve("x"), Y = solve("y");
    if (!X || !Y) return null;
    const det = X[0] * Y[1] - X[1] * Y[0];
    if (!det) return null;
    return {
      to: (x, y) => [X[0] * x + X[1] * y + X[2], Y[0] * x + Y[1] * y + Y[2]],
      from: (mx, my) => { const u = mx - X[2], v = my - Y[2]; return [(Y[1] * u - X[1] * v) / det, (-Y[0] * u + X[0] * v) / det]; },
    };
  }

  /** Géométrie de la carte : calibration, pièces, robot et base (attributs de l'entité image ou camera). */
  _geo(r) {
    const a = this._st(r.map)?.attributes || {}, v = this._st(r.vac)?.attributes || {};
    let cal = null;
    const pts = a.calibration_points || v.calibration_points;
    if (Array.isArray(pts) && pts.length >= 3 && pts.every((p) => p?.vacuum && p?.map)) cal = RobotCard.affine(pts);
    const names = new Map(this._rooms(r).map((x) => [String(x.id), x.name]));
    let raw = a.rooms || null;
    if (raw && !Array.isArray(raw)) {
      const vals = Object.values(raw);
      raw = vals.every(Array.isArray) ? (raw[a.selected_map ?? v.selected_map] || vals[0] || []) : Object.entries(raw).map(([id, x]) => (typeof x === "object" ? { id, ...x } : null)).filter(Boolean);
    }
    const rooms = cal && Array.isArray(raw) ? raw.map((x) => {
      const id = String(x.room_id ?? x.id ?? x.segment_id ?? "");
      let poly = null;
      const ol = x.outline || x.polygon;
      if (Array.isArray(ol) && ol.length > 2) poly = ol.map((p) => (Array.isArray(p) ? p : [p.x, p.y]));
      else if ([x.x0, x.y0, x.x1, x.y1].every((n) => Number.isFinite(Number(n)))) poly = [[x.x0, x.y0], [x.x1, x.y0], [x.x1, x.y1], [x.x0, x.y1]];
      if (!poly || !id) return null;
      return { id, name: names.get(id) || x.name || `Pièce ${id}`, pts: poly.map(([px, py]) => cal.to(Number(px), Number(py))) };
    }).filter(Boolean) : [];
    const pos = (p) => (p && Number.isFinite(Number(p.x)) && cal ? cal.to(Number(p.x), Number(p.y)) : null);
    return { cal, rooms, robot: pos(a.vacuum_position || v.vacuum_position), dock: pos(a.charger_position || v.charger_position), angle: Number((a.vacuum_position || {}).a) || 0 };
  }

  /** Zone et « aller ici » : seulement pour les intégrations dont le service est connu. */
  _can(r, what) {
    return ["dreame_vacuum", "xiaomi_miio", "roborock"].includes(r.platform) && !!this._geo(r).cal && (what === "zone" || what === "goto");
  }

  /** Bloc de la carte, gardé d'un affichage à l'autre (zoom, déplacement et image conservés). */
  _mapBox(r) {
    if (this._mb && this._mb.vac === r.vac) return this._mb.el;
    const el = document.createElement("div");
    el.className = "rb-mapv";
    el.innerHTML = `<div class="rb-mw"><img alt="Carte du logement" draggable="false"><svg class="rb-ov" preserveAspectRatio="none"></svg></div>
      <div class="rb-mtools"><button data-z="in" title="Zoomer" aria-label="Zoomer"><ha-icon icon="mdi:plus"></ha-icon></button><button data-z="out" title="Dézoomer" aria-label="Dézoomer"><ha-icon icon="mdi:minus"></ha-icon></button>
      <button data-z="fit" title="Recentrer" aria-label="Recentrer"><ha-icon icon="mdi:fit-to-screen-outline"></ha-icon></button><button data-z="full" title="Plein écran" aria-label="Plein écran"><ha-icon icon="mdi:fullscreen"></ha-icon></button></div>`;
    const mb = { vac: r.vac, el, w: el.querySelector(".rb-mw"), img: el.querySelector("img"), svg: el.querySelector("svg"), s: 1, x: 0, y: 0 };
    this._mb = mb;
    mb.img.addEventListener("load", () => { mb.nw = mb.img.naturalWidth || mb.img.width || 400; mb.nh = mb.img.naturalHeight || mb.img.height || 300; mb.w.style.aspectRatio = `${mb.nw} / ${mb.nh}`; this._mapDraw(); });
    const apply = () => { mb.w.style.transform = `translate(${mb.x}px, ${mb.y}px) scale(${mb.s})`; };
    const zoomAt = (f, cx, cy) => {
      const ns = Math.max(1, Math.min(6, mb.s * f));
      const b = el.getBoundingClientRect(), px = cx - b.left, py = cy - b.top;
      mb.x = px - ((px - mb.x) * ns) / mb.s; mb.y = py - ((py - mb.y) * ns) / mb.s; mb.s = ns;
      if (ns === 1) { mb.x = 0; mb.y = 0; }
      apply();
    };
    el.querySelector(".rb-mtools").addEventListener("click", (ev) => {
      ev.stopPropagation();
      const z = ev.target.closest("[data-z]")?.dataset.z, b = el.getBoundingClientRect();
      if (z === "in") zoomAt(1.5, b.left + b.width / 2, b.top + b.height / 2);
      else if (z === "out") zoomAt(1 / 1.5, b.left + b.width / 2, b.top + b.height / 2);
      else if (z === "fit") { mb.s = 1; mb.x = 0; mb.y = 0; apply(); }
      else if (z === "full") { if (document.fullscreenElement) document.exitFullscreen?.(); else el.requestFullscreen?.(); }
    });
    el.addEventListener("wheel", (ev) => { ev.preventDefault(); zoomAt(ev.deltaY < 0 ? 1.2 : 1 / 1.2, ev.clientX, ev.clientY); }, { passive: false });
    // pointeurs : un doigt déplace (ou trace la zone), deux doigts zooment, un simple toucher agit
    const ptrs = new Map();
    let start = null, pinch = null;
    const imgPt = (cx, cy) => {
      const b = mb.w.getBoundingClientRect();
      return [((cx - b.left) / b.width) * (mb.nw || 1), ((cy - b.top) / b.height) * (mb.nh || 1)];
    };
    el.addEventListener("pointerdown", (ev) => {
      if (ev.target.closest(".rb-mtools")) return;
      el.setPointerCapture(ev.pointerId);
      ptrs.set(ev.pointerId, [ev.clientX, ev.clientY]);
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: mb.s }; start = null; return; }
      start = { cx: ev.clientX, cy: ev.clientY, x: mb.x, y: mb.y, moved: false, p0: imgPt(ev.clientX, ev.clientY) };
    });
    el.addEventListener("pointermove", (ev) => {
      if (!ptrs.has(ev.pointerId)) return;
      ptrs.set(ev.pointerId, [ev.clientX, ev.clientY]);
      if (pinch && ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        zoomAt((pinch.s * Math.hypot(a[0] - b[0], a[1] - b[1])) / pinch.d / mb.s, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        return;
      }
      if (!start) return;
      const dx = ev.clientX - start.cx, dy = ev.clientY - start.cy;
      if (Math.hypot(dx, dy) > 6) start.moved = true;
      if (!start.moved) return;
      if ((this._mode?.[mb.vac] || "rooms") === "zone") { this._drag = [start.p0, imgPt(ev.clientX, ev.clientY)]; this._mapDraw(); }
      else if (mb.s > 1) { mb.x = start.x + dx; mb.y = start.y + dy; apply(); }
    });
    const end = (ev) => {
      if (!ptrs.has(ev.pointerId)) return;
      ptrs.delete(ev.pointerId);
      if (ptrs.size < 2) pinch = null;
      if (!start) return;
      const mode = this._mode?.[mb.vac] || "rooms", rr = this._resolve().find((x) => x.vac === mb.vac), g = rr ? this._geo(rr) : null;
      if (start.moved && mode === "zone" && this._drag && g?.cal) {
        const [[ax, ay], [bx, by]] = this._drag;
        if (Math.abs(ax - bx) > 4 && Math.abs(ay - by) > 4) (this._zone ||= {})[mb.vac] = [g.cal.from(ax, ay), g.cal.from(bx, by)];
        this._drag = null; this._sig = null; this._render();
      } else if (!start.moved && g) {
        const [px, py] = imgPt(ev.clientX, ev.clientY);
        if (mode === "goto" && g.cal) { (this._pt ||= {})[mb.vac] = g.cal.from(px, py); this._sig = null; this._render(); }
        else if (mode === "rooms") {
          const hit = g.rooms.find((x) => inPoly(px, py, x.pts));
          if (hit) {
            const cur = new Set(this._sel[mb.vac] || []);
            cur.has(hit.id) ? cur.delete(hit.id) : cur.add(hit.id);
            this._sel[mb.vac] = [...cur];
            this._sig = null; this._render();
          }
        }
      }
      start = null;
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("click", (ev) => ev.stopPropagation()); // pas de fiche d'entité au toucher de la carte
    return el;
  }

  /** Image et calques : pièces choisies, zone, point, robot et base. */
  _mapDraw() {
    const mb = this._mb, r = this._mapR;
    if (!mb || !r || mb.vac !== r.vac) return;
    if (this._mapSrc && mb.src !== this._mapSrc) { mb.src = this._mapSrc; mb.img.src = this._mapSrc; }
    if (!mb.nw) return;
    const g = this._geo(r), sel = new Set(this._sel[r.vac] || []);
    mb.svg.setAttribute("viewBox", `0 0 ${mb.nw} ${mb.nh}`);
    const k = Math.max(mb.nw, mb.nh) / 400; // épaisseurs proportionnelles à la taille de l'image
    const P = (pts) => pts.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");
    let out = g.rooms.map((x) => `<polygon class="rb-room ${sel.has(x.id) ? "on" : ""}" points="${P(x.pts)}" stroke-width="${2 * k}"><title>${esc(x.name)}</title></polygon>`).join("");
    const box = (a, b, cls) => `<rect class="${cls}" x="${Math.min(a[0], b[0])}" y="${Math.min(a[1], b[1])}" width="${Math.abs(a[0] - b[0])}" height="${Math.abs(a[1] - b[1])}" stroke-width="${2 * k}"></rect>`;
    const zone = this._zone?.[r.vac];
    if (this._drag) out += box(this._drag[0], this._drag[1], "rb-zone");
    else if (zone && g.cal && (this._mode?.[r.vac] === "zone")) out += box(g.cal.to(...zone[0]), g.cal.to(...zone[1]), "rb-zone");
    const pt = this._pt?.[r.vac];
    if (pt && g.cal && this._mode?.[r.vac] === "goto") { const [x, y] = g.cal.to(...pt); out += `<circle class="rb-pt" cx="${x}" cy="${y}" r="${6 * k}" stroke-width="${2 * k}"></circle>`; }
    if (g.robot) out += `<circle class="rb-bot" cx="${g.robot[0]}" cy="${g.robot[1]}" r="${5 * k}" stroke-width="${1.5 * k}"></circle>`;
    mb.svg.innerHTML = out;
  }
}

const RB_STYLE = `<style>
.rb-top { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.rb-bat { display: grid; grid-template-columns: auto auto; align-items: center; column-gap: 6px; padding: 8px 12px; border-radius: 12px;
  border: 1px solid var(--med-line); background: var(--med-surface); cursor: pointer; min-width: 92px; }
.rb-bat ha-icon { --mdc-icon-size: 22px; grid-row: span 2; color: var(--med-muted); }
.rb-bat b { font-size: 1rem; } .rb-bat span { font-size: .7rem; color: var(--med-muted); }
.rb-bbar { grid-column: 1 / -1; height: 5px; border-radius: 4px; background: var(--med-line); margin-top: 6px; overflow: hidden; }
.rb-bbar i { display: block; height: 100%; background: var(--med-down); border-radius: 4px; }
.rb-bat.ok ha-icon { color: var(--med-down); } .rb-bat.warn ha-icon, .rb-bat.warn b { color: var(--pc-warn); } .rb-bat.warn .rb-bbar i { background: var(--pc-warn); }
.rb-bat.bad { border-color: var(--t-red); } .rb-bat.bad ha-icon, .rb-bat.bad b { color: var(--t-red); } .rb-bat.bad .rb-bbar i { background: var(--t-red); }
.rb-fh { all: unset; box-sizing: border-box; cursor: pointer; display: flex; width: 100%; align-items: center; gap: 6px; padding: 8px 10px; margin: 0;
  border-radius: 12px; border: 1px solid var(--med-line); background: var(--med-surface); font-size: .86rem; font-weight: 600; }
.rb-fh:hover { border-color: var(--med-blue); } .rb-fh:focus-visible { outline: 2px solid var(--med-blue); }
.rb-fs { margin-left: auto; font-size: .74rem; font-weight: 500; color: var(--med-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.rb-fs b.warn { color: var(--pc-warn); } .rb-fs b.bad { color: var(--t-red); }
.rb-chev { --mdc-icon-size: 20px !important; color: var(--med-muted) !important; margin-left: auto; transition: transform .2s; flex: none; }
.rb-fs + .rb-chev { margin-left: 4px; }
.rb-fold.open .rb-fh { border-color: transparent; background: none; padding: 0 2px; margin-bottom: 8px; }
.rb-fold.open .rb-chev { transform: rotate(180deg); }
@media (prefers-reduced-motion: reduce) { .rb-chev { transition: none; } }
.rb-sub { font-size: .74rem; color: var(--med-muted); margin: 10px 2px 6px; }
.rb-fans, .rb-rooms { display: flex; flex-wrap: wrap; gap: 6px; }
.rb-chip { all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 999px;
  border: 1px solid var(--med-line); background: var(--med-surface); font-size: .78rem; font-weight: 600; }
.rb-chip ha-icon { --mdc-icon-size: 16px; }
.rb-chip:hover { border-color: var(--med-blue); } .rb-chip:focus-visible { outline: 2px solid var(--med-blue); }
.rb-chip.on { border-color: var(--med-blue); background: color-mix(in srgb, var(--med-blue) 18%, var(--med-surface)); color: var(--med-text); }
.rb-go { margin-top: 8px; width: 100%; }
.rb-go[disabled] { opacity: .5; cursor: default; color: var(--med-muted); border-color: var(--med-line); }
.rb-sels { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px; margin-top: 8px; }
.rb-sel { display: grid; gap: 3px; font-size: .72rem; color: var(--med-muted); }
.rb-sel select { font: inherit; font-size: .8rem; color: var(--med-text); background: var(--med-surface); border: 1px solid var(--med-line); border-radius: 10px; padding: 7px 8px; }
.rb-mapv { position: relative; border-radius: 12px; overflow: hidden; border: 1px solid var(--med-line); background: var(--med-surface);
  touch-action: none; user-select: none; -webkit-user-select: none; cursor: grab; }
.rb-mapv:fullscreen { display: flex; align-items: center; justify-content: center; background: var(--med-bg); border-radius: 0; }
.rb-mw { position: relative; width: 100%; max-height: 420px; margin: 0 auto; transform-origin: 0 0; }
.rb-mapv:fullscreen .rb-mw { max-height: 100vh; width: auto; height: 100vh; }
.rb-mw img { display: block; width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
.rb-ov { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.rb-room { fill: transparent; stroke: transparent; }
.rb-room.on { fill: color-mix(in srgb, var(--med-blue) 35%, transparent); stroke: var(--med-blue); }
.rb-zone { fill: color-mix(in srgb, var(--med-green) 25%, transparent); stroke: var(--med-green); stroke-dasharray: 6 4; }
.rb-pt { fill: var(--pc-warn); stroke: #fff; }
.rb-bot { fill: var(--med-blue); stroke: #fff; }
.rb-mtools { position: absolute; top: 8px; right: 8px; display: flex; flex-direction: column; gap: 4px; }
.rb-mtools button { all: unset; cursor: pointer; display: inline-flex; padding: 6px; border-radius: 9px; background: color-mix(in srgb, var(--med-bg) 80%, transparent);
  border: 1px solid var(--med-line); color: var(--med-text); }
.rb-mtools button:hover { border-color: var(--med-blue); } .rb-mtools button:focus-visible { outline: 2px solid var(--med-blue); }
.rb-mtools ha-icon { --mdc-icon-size: 18px; }
.rb-modes { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.rb-hint { font-size: .72rem; color: var(--med-muted); margin: 6px 2px 0; }
.rb-hint:empty { display: none; }
.rb-zact { display: grid; grid-template-columns: 2fr 1fr; gap: 6px; margin-top: 6px; }
.rb-conss { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 6px; }
.rb-cons { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto auto; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 12px;
  border: 1px solid var(--med-line); background: var(--med-surface); cursor: pointer; }
.rb-cons > ha-icon { --mdc-icon-size: 20px; color: var(--med-blue); }
.rb-cn { display: grid; gap: 3px; min-width: 0; } .rb-cn b { font-size: .8rem; } .rb-cn span { font-size: .7rem; color: var(--med-muted); }
.rb-cn span:empty { display: none; }
.rb-cn .pc-bar { height: 6px; }
.rb-cp { font-size: .9rem; }
.rb-cons.warn { border-color: color-mix(in srgb, var(--pc-warn) 60%, transparent); } .rb-cons.warn .rb-cp { color: var(--pc-warn); }
.rb-cons.bad { border-color: var(--t-red); } .rb-cons.bad .rb-cp, .rb-cons.bad .rb-cn span { color: var(--t-red); }
.rb-reset { all: unset; cursor: pointer; display: inline-flex; padding: 5px; border-radius: 8px; border: 1px solid var(--med-line); color: var(--med-muted); }
.rb-reset ha-icon { --mdc-icon-size: 16px; }
.rb-reset:hover { border-color: var(--med-blue); color: var(--med-text); } .rb-reset:focus-visible { outline: 2px solid var(--med-blue); }
.rb-reset.armed { color: var(--pc-warn); border-color: var(--pc-warn); background: color-mix(in srgb, var(--pc-warn) 18%, transparent); }
@container (max-width: 340px) { .rb-top { grid-template-columns: 1fr; } }
</style>`;

const RB_SCHEMA = [
  { name: "title", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "icon_color", selector: { text: {} } },
  { name: "robots", selector: { entity: { domain: "vacuum", multiple: true } } },
  { name: "expanded", selector: { select: { multiple: true, mode: "list", options: [
    { value: "settings", label: "Réglages" }, { value: "map", label: "Carte" }, { value: "rooms", label: "Pièces" },
    { value: "consumables", label: "Consommables" }, { value: "stats", label: "Statistiques" }] } } },
  { name: "show_controls", selector: { boolean: {} } },
  { name: "show_map", selector: { boolean: {} } },
  { name: "show_rooms", selector: { boolean: {} } },
  { name: "show_consumables", selector: { boolean: {} } },
  { name: "show_stats", selector: { boolean: {} } },
  THEME_SELECT,
];
const RB_LABELS = {
  title: "Titre (vide = nom du robot, ou Aspirateurs robots)",
  icon: "Icône",
  icon_color: "Couleur de l'icône",
  robots: "Robots affichés, dans cet ordre (vide = tous)",
  expanded: "Sections dépliées à l'ouverture (ensuite, chaque section garde votre choix)",
  show_controls: "Commandes (nettoyer, pause, retour base, aspiration, réglages)",
  show_map: "Carte du logement",
  show_rooms: "Nettoyage par pièce",
  show_consumables: "Consommables (brosses, filtre, capteurs, serpillière)",
  show_stats: "Statistiques",
  theme: "Couleurs de la carte",
};
const RobotCardEditor = makeEditor(RB_SCHEMA, RB_LABELS, RB_DEFAULTS);


/* ---------------------------------------------------------- enregistrement */

if (typeof customElements !== "undefined") {
  if (!customElements.get("electromenager-robot-card")) customElements.define("electromenager-robot-card", RobotCard);
  if (!customElements.get("electromenager-robot-card-editor")) customElements.define("electromenager-robot-card-editor", RobotCardEditor);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === "electromenager-robot-card")) {
    window.customCards.push({
      type: "electromenager-robot-card",
      name: "Aspirateur robot",
      description: "État, batterie, commandes, puissance d'aspiration, carte du logement, nettoyage par pièce, consommables et statistiques.",
      preview: true,
    });
  }
  console.info(`%c ELECTROMENAGER %c ${CARD_VERSION} `, "background:#1a2434;color:#96d21f;font-weight:700", "background:#1d93e3;color:#fff");
}
})();
