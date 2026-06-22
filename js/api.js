// Data access layer: loads locally-generated per-season player stats, and
// optionally enriches with the free balldontlie live API. Attaches to NBA.api.
//
// All methods degrade gracefully: if a network request or local file is
// unavailable, they resolve to null/[] instead of throwing.
window.NBA = window.NBA || {};

window.NBA.api = (function () {
  var store = NBA.store;
  var BDL_BASE = "https://api.balldontlie.io/v1";

  // ---- tiny persistent cache (localStorage) for id/team lookups ---------
  function lsGet(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : undefined; } catch (e) { return undefined; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

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
  function hasLiveApi() { return !!store.getApiKey(); }

  // Returns { ok, status, data, error }. Never throws.
  function bdlFetch(path) {
    var key = store.getApiKey();
    if (!key) return Promise.resolve({ ok: false, status: 0, error: "no-key" });
    return fetch(BDL_BASE + path, { headers: { Authorization: key } })
      .then(function (r) {
        return r.json().catch(function () { return null; }).then(function (body) {
          if (r.ok) return { ok: true, status: r.status, data: body };
          var err = r.status === 401 ? "bad-key"
            : r.status === 429 ? "rate-limited"
            : (r.status === 403 || r.status === 402) ? "plan"
            : "http-" + r.status;
          return { ok: false, status: r.status, error: err, data: body };
        });
      })
      .catch(function () { return { ok: false, status: 0, error: "network" }; });
  }

  // Verify a key by hitting a cheap endpoint. Returns Promise<{ok,error}>.
  function testKey() {
    return bdlFetch("/teams?per_page=1").then(function (r) {
      return { ok: r.ok, error: r.error };
    });
  }

  // balldontlie team id -> { abbr, full_name }. Cached in localStorage.
  function getBdlTeams() {
    var cached = lsGet("nba.bdlTeams");
    if (cached) return Promise.resolve(cached);
    return bdlFetch("/teams?per_page=100").then(function (r) {
      if (!r.ok || !r.data || !r.data.data) return {};
      var map = {};
      r.data.data.forEach(function (t) {
        map[t.id] = { abbr: t.abbreviation, full_name: t.full_name };
      });
      lsSet("nba.bdlTeams", map);
      return map;
    });
  }

  // Search live players by name (returns balldontlie player objects or []).
  function searchPlayers(query) {
    if (!query) return Promise.resolve([]);
    return bdlFetch("/players?search=" + encodeURIComponent(query) + "&per_page=25")
      .then(function (r) { return (r.ok && r.data && r.data.data) ? r.data.data : []; });
  }

  // Resolve our player (NBA id + name) to a balldontlie player id.
  // Caches the mapping in localStorage. Returns Promise<player|null>.
  function resolveBdlPlayer(nbaId, name) {
    var ck = "nba.bdlId." + nbaId;
    var cached = lsGet(ck);
    if (cached !== undefined) return Promise.resolve(cached);
    return searchPlayers(name).then(function (list) {
      if (!list.length) { lsSet(ck, null); return null; }
      var target = (name || "").toLowerCase().trim();
      var exact = list.find(function (p) {
        return ((p.first_name + " " + p.last_name).toLowerCase().trim() === target);
      });
      var chosen = exact || list[0];
      lsSet(ck, chosen);
      return chosen;
    });
  }

  // Full season averages for a balldontlie player id + balldontlie season
  // (the START year, e.g. 2023 for the 2023-24 season).
  function seasonAverages(bdlPlayerId, bdlSeason) {
    return bdlFetch("/season_averages?season=" + bdlSeason + "&player_ids[]=" + bdlPlayerId)
      .then(function (r) { return (r.ok && r.data && r.data.data && r.data.data[0]) ? r.data.data[0] : null; });
  }

  // Every box score (game log) for a player in a season. Handles pagination.
  function gameLog(bdlPlayerId, bdlSeason) {
    var out = [];
    function page(cursor) {
      var url = "/stats?seasons[]=" + bdlSeason + "&player_ids[]=" + bdlPlayerId + "&per_page=100";
      if (cursor) url += "&cursor=" + cursor;
      return bdlFetch(url).then(function (r) {
        if (!r.ok) return { error: r.error };
        var data = (r.data && r.data.data) || [];
        out = out.concat(data);
        var next = r.data && r.data.meta && r.data.meta.next_cursor;
        if (next && out.length < 120) return page(next);
        return { games: out };
      });
    }
    return page(null);
  }

  // Orchestrates a full "season view" for a player profile.
  // Returns Promise<{ status, averages, games, teams }> where status is one of:
  //   ok | no-key | not-found | rate-limited | plan | bad-key | empty | error
  function loadPlayerSeason(nbaId, name, endYear) {
    if (!hasLiveApi()) return Promise.resolve({ status: "no-key" });
    var bdlSeason = endYear - 1; // balldontlie uses the season's start year
    return resolveBdlPlayer(nbaId, name).then(function (player) {
      if (!player) return { status: "not-found" };
      return Promise.all([
        getBdlTeams(),
        seasonAverages(player.id, bdlSeason),
        gameLog(player.id, bdlSeason)
      ]).then(function (res) {
        var teams = res[0], avg = res[1], log = res[2];
        if (log && log.error) {
          return { status: log.error, averages: avg, teams: teams, bdl: player };
        }
        var games = (log && log.games) || [];
        if (!games.length && !avg) return { status: "empty", bdl: player, teams: teams };
        return { status: "ok", averages: avg, games: games, teams: teams, bdl: player };
      });
    });
  }

  return {
    loadLocalPlayerStats: loadLocalPlayerStats,
    hasLiveApi: hasLiveApi,
    testKey: testKey,
    searchPlayers: searchPlayers,
    resolveBdlPlayer: resolveBdlPlayer,
    seasonAverages: seasonAverages,
    gameLog: gameLog,
    getBdlTeams: getBdlTeams,
    loadPlayerSeason: loadPlayerSeason
  };
})();
