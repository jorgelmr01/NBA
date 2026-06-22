// Small helpers shared across views. Attaches to NBA.util.
window.NBA = window.NBA || {};

window.NBA.util = (function () {
  // Escape text for safe insertion into innerHTML.
  function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Build a lookup of teams by id and by abbr.
  function teamMaps() {
    const byId = {}, byAbbr = {};
    (NBA.teams || []).forEach(function (t) {
      byId[t.id] = t;
      byAbbr[t.abbr] = t;
    });
    return { byId: byId, byAbbr: byAbbr };
  }

  function teamById(id) {
    return (NBA.teams || []).find(function (t) { return String(t.id) === String(id); });
  }

  function teamByAbbr(abbr) {
    return (NBA.teams || []).find(function (t) { return t.abbr === abbr; });
  }

  // Count championships a team had accumulated through (and including) a year.
  function champsThrough(team, year) {
    return (team.championships || []).filter(function (y) { return y <= year; }).length;
  }

  // Season label, e.g. 2024 -> "2023-24".
  function seasonLabel(endYear) {
    const start = endYear - 1;
    return start + "-" + String(endYear).slice(-2);
  }

  // Format a number to a fixed number of decimals, blank if missing.
  function num(v, d) {
    if (v === null || v === undefined || v === "") return "—";
    const n = Number(v);
    if (isNaN(n)) return "—";
    return d === undefined ? String(n) : n.toFixed(d);
  }

  // Initials from a name for avatar fallback.
  function initials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    const first = parts[0] ? parts[0][0] : "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }

  // Readable contrast color (black/white) for a given hex background.
  function contrastColor(hex) {
    if (!hex) return "#fff";
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 140 ? "#111" : "#fff";
  }

  return {
    esc: esc,
    teamMaps: teamMaps,
    teamById: teamById,
    teamByAbbr: teamByAbbr,
    champsThrough: champsThrough,
    seasonLabel: seasonLabel,
    num: num,
    initials: initials,
    contrastColor: contrastColor
  };
})();
