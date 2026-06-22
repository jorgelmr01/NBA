// Persistent user state (favorite team, API key) via localStorage,
// plus a tiny in-memory cache. Attaches to NBA.store.
window.NBA = window.NBA || {};

window.NBA.store = (function () {
  var KEY_FAV = "nba.favoriteTeam";
  var KEY_API = "nba.apiKey";
  var KEY_SEEN = "nba.onboarded";

  var mem = {}; // in-memory cache for fetched data within a session

  function get(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function set(key, val) {
    try { if (val === null) window.localStorage.removeItem(key); else window.localStorage.setItem(key, val); } catch (e) {}
  }

  return {
    getFavorite: function () { return get(KEY_FAV); },
    setFavorite: function (teamId) { set(KEY_FAV, teamId ? String(teamId) : null); },

    getApiKey: function () {
      // Prefer an explicitly configured key (js/config.js), else localStorage.
      if (window.NBA_CONFIG && window.NBA_CONFIG.balldontlieKey) return window.NBA_CONFIG.balldontlieKey;
      return get(KEY_API);
    },
    setApiKey: function (k) { set(KEY_API, k || null); },

    hasOnboarded: function () { return get(KEY_SEEN) === "1"; },
    setOnboarded: function () { set(KEY_SEEN, "1"); },

    cacheGet: function (k) { return mem[k]; },
    cacheSet: function (k, v) { mem[k] = v; return v; }
  };
})();
