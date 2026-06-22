// Data access layer: loads locally-generated per-season player stats, and
// optionally enriches with the free balldontlie live API. Attaches to NBA.api.
//
// All methods degrade gracefully: if a network request or local file is
// unavailable, they resolve to null/[] instead of throwing.
window.NBA = window.NBA || {};

window.NBA.api = (function () {
  var store = NBA.store;
  var BDL_BASE = "https://api.balldontlie.io/v1";

  // ---- Local generated stats (data/players/{id}.json) -------------------
  // Produced by tools/generate-players. Shape:
  //   { id, name, seasons: [{ season, teamId, gp, min, pts, reb, ast, stl, blk,
  //     fg_pct, fg3_pct, ft_pct, type: "regular"|"playoffs" }] }
  function loadLocalPlayerStats(id) {
    var cacheKey = "local-stats-" + id;
    var cached = store.cacheGet(cacheKey);
    if (cached !== undefined) return Promise.resolve(cached);
    return fetch("data/players/" + id + ".json", { cache: "force-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (data) { store.cacheSet(cacheKey, data); return data; });
  }

  // ---- balldontlie live API --------------------------------------------
  function bdlHeaders() {
    var key = store.getApiKey();
    return key ? { Authorization: key } : {};
  }

  function hasLiveApi() { return !!store.getApiKey(); }

  function bdlFetch(path) {
    if (!hasLiveApi()) return Promise.resolve(null);
    return fetch(BDL_BASE + path, { headers: bdlHeaders() })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  // Search live players by name (returns balldontlie player objects or []).
  function searchPlayers(query) {
    if (!query) return Promise.resolve([]);
    return bdlFetch("/players?search=" + encodeURIComponent(query) + "&per_page=25")
      .then(function (res) { return (res && res.data) ? res.data : []; });
  }

  // Live season averages for a balldontlie player id + season (end year - 1).
  function seasonAverages(bdlPlayerId, season) {
    return bdlFetch("/season_averages?season=" + season + "&player_ids[]=" + bdlPlayerId)
      .then(function (res) { return (res && res.data && res.data[0]) ? res.data[0] : null; });
  }

  return {
    loadLocalPlayerStats: loadLocalPlayerStats,
    hasLiveApi: hasLiveApi,
    searchPlayers: searchPlayers,
    seasonAverages: seasonAverages
  };
})();
