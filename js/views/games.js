// Upcoming games + player-level projections. Attaches to NBA.views.games.
//
// Projections are transparent: a player's baseline is their season average
// (this season, or last season if this one hasn't started), nudged slightly
// for home-court, and optionally blended with their recent-form (last games).
window.NBA = window.NBA || {};
window.NBA.views = window.NBA.views || {};

window.NBA.views.games = (function () {
  var util = NBA.util;
  var api = NBA.api;

  var state = { games: [], cache: {} };

  // ---- projection math --------------------------------------------------
  // Convert a balldontlie season_averages object into a clean stat line.
  function lineFromAvg(a) {
    if (!a) return null;
    return {
      min: Number(a.min) || 0, pts: Number(a.pts) || 0, reb: Number(a.reb) || 0,
      ast: Number(a.ast) || 0, stl: Number(a.stl) || 0, blk: Number(a.blk) || 0,
      tov: Number(a.turnover) || 0, fg3m: Number(a.fg3m) || 0, gp: Number(a.games_played) || 0
    };
  }

  // Average a set of game-log rows into a stat line.
  function lineFromGames(games) {
    if (!games || !games.length) return null;
    var s = { min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fg3m: 0 };
    games.forEach(function (g) {
      s.min += parseMin(g.min); s.pts += g.pts || 0; s.reb += g.reb || 0; s.ast += g.ast || 0;
      s.stl += g.stl || 0; s.blk += g.blk || 0; s.tov += g.turnover || 0; s.fg3m += g.fg3m || 0;
    });
    var n = games.length;
    Object.keys(s).forEach(function (k) { s[k] = s[k] / n; });
    s.gp = n;
    return s;
  }

  function parseMin(m) {
    if (m == null) return 0;
    if (typeof m === "number") return m;
    var p = String(m).split(":");
    return Number(p[0]) + (Number(p[1]) || 0) / 60;
  }

  // Blend a season-average baseline with recent form, with a home/away nudge.
  function project(baseline, recent, isHome) {
    if (!baseline) return null;
    var w = recent ? 0.4 : 0; // recent-form weight when available
    function mix(k) { return baseline[k] * (1 - w) + (recent ? recent[k] * w : 0); }
    var scoring = isHome ? 1.02 : 0.99; // modest home-court effect on output
    return {
      min: mix("min"),
      pts: mix("pts") * scoring,
      reb: mix("reb"),
      ast: mix("ast") * scoring,
      stl: mix("stl"),
      blk: mix("blk"),
      tov: mix("tov"),
      fg3m: mix("fg3m") * scoring,
      gp: baseline.gp
    };
  }

  // ---- data orchestration ----------------------------------------------
  // Build projected lines for both teams of a game. Returns a Promise of
  // { home:{team,lines}, visitor:{team,lines}, season }.
  function buildProjection(game) {
    var season = game.season; // balldontlie season start year
    var homeId = game.home_team.id, visId = game.visitor_team.id;

    return Promise.all([api.teamRoster(homeId), api.teamRoster(visId)]).then(function (rosters) {
      var home = rosters[0], visitor = rosters[1];
      var ids = home.concat(visitor).map(function (p) { return p.id; });
      return api.seasonAveragesMulti(ids, season).then(function (avgMap) {
        // Fall back to previous season for players with no data yet.
        var missing = ids.filter(function (id) { return !avgMap[id]; });
        var fallback = missing.length
          ? api.seasonAveragesMulti(missing, season - 1)
          : Promise.resolve({});
        return fallback.then(function (prevMap) {
          function linesFor(roster, isHome) {
            return roster.map(function (p) {
              var avg = avgMap[p.id] || prevMap[p.id];
              var baseline = lineFromAvg(avg);
              if (!baseline || baseline.min < 8) return null; // skip deep bench
              var proj = project(baseline, null, isHome);
              return {
                id: p.id, name: p.first_name + " " + p.last_name,
                pos: p.position || "", proj: proj,
                fromPrev: !avgMap[p.id]
              };
            }).filter(Boolean).sort(function (a, b) { return b.proj.min - a.proj.min; }).slice(0, 10);
          }
          return {
            season: season,
            home: { team: game.home_team, lines: linesFor(home, true) },
            visitor: { team: game.visitor_team, lines: linesFor(visitor, false) }
          };
        });
      });
    });
  }

  // ---- rendering --------------------------------------------------------
  function fmtDate(g) {
    var d = new Date(g.datetime || g.date);
    if (isNaN(d)) return util.esc(g.date || "");
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
      (g.datetime ? " \u00B7 " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "");
  }

  function gameCard(g) {
    var v = g.visitor_team, h = g.home_team;
    return '<div class="game-card" data-game="' + g.id + '">' +
      '<div class="game-card__head">' +
      '  <div class="game-card__matchup">' +
      '    <span class="game-card__team">' + util.esc(v.full_name) + '</span>' +
      '    <span class="game-card__at">@</span>' +
      '    <span class="game-card__team">' + util.esc(h.full_name) + '</span>' +
      '  </div>' +
      '  <span class="game-card__date">' + fmtDate(g) + '</span>' +
      '</div>' +
      '<button class="btn btn--primary game-card__btn" data-project="' + g.id + '">Project box score</button>' +
      '<div class="game-card__proj" id="proj-' + g.id + '"></div>' +
      '</div>';
  }

  function projTable(side) {
    var rows = side.lines.map(function (l) {
      var p = l.proj;
      return '<tr>' +
        '<td class="proj__name"><a href="#/player/' + l.id + '">' + util.esc(l.name) + '</a>' +
        (l.fromPrev ? ' <span class="tag">prev yr</span>' : '') + '</td>' +
        '<td>' + util.num(p.min, 1) + '</td>' +
        '<td><strong>' + util.num(p.pts, 1) + '</strong></td>' +
        '<td>' + util.num(p.reb, 1) + '</td>' +
        '<td>' + util.num(p.ast, 1) + '</td>' +
        '<td>' + util.num(p.stl, 1) + '</td>' +
        '<td>' + util.num(p.blk, 1) + '</td>' +
        '<td>' + util.num(p.tov, 1) + '</td>' +
        '<td>' + util.num(p.fg3m, 1) + '</td>' +
        '</tr>';
    }).join("");
    var total = side.lines.reduce(function (sum, l) { return sum + l.proj.pts; }, 0);
    var head = '<tr><th>Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TOV</th><th>3PM</th></tr>';
    return '<div class="proj__team">' +
      '<h4 class="proj__title">' + util.esc(side.team.full_name) +
      ' <span class="proj__score">~' + Math.round(total) + ' pts</span></h4>' +
      '<div class="table-wrap"><table class="stats-table"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>' +
      '</div>';
  }

  function renderProjection(gameId, data) {
    var host = document.getElementById("proj-" + gameId);
    if (!host) return;
    if (!data || (!data.home.lines.length && !data.visitor.lines.length)) {
      host.innerHTML = '<p class="muted">No projection data available for this matchup (rosters or season averages missing).</p>';
      return;
    }
    var winner = null;
    var hp = data.home.lines.reduce(function (s, l) { return s + l.proj.pts; }, 0);
    var vp = data.visitor.lines.reduce(function (s, l) { return s + l.proj.pts; }, 0);
    if (hp || vp) winner = hp >= vp ? data.home.team.full_name : data.visitor.team.full_name;
    host.innerHTML =
      (winner ? '<p class="proj__pick">Projected edge: <strong>' + util.esc(winner) + '</strong> (' +
        Math.round(Math.max(hp, vp)) + '\u2013' + Math.round(Math.min(hp, vp)) + ')</p>' : '') +
      projTable(data.visitor) + projTable(data.home) +
      '<p class="muted proj__method">Baseline = ' + (data.season + 1) + ' season averages (falls back to prior year for players ' +
      'without data yet), with a small home-court adjustment. Open a player for their full game-by-game log.</p>';
  }

  function onProjectClick(gameId, btn) {
    var host = document.getElementById("proj-" + gameId);
    if (state.cache[gameId]) { // toggle
      if (host.innerHTML) { host.innerHTML = ""; btn.textContent = "Project box score"; }
      else { renderProjection(gameId, state.cache[gameId]); btn.textContent = "Hide projection"; }
      return;
    }
    var game = state.games.find(function (g) { return String(g.id) === String(gameId); });
    if (!game) return;
    btn.disabled = true; btn.textContent = "Projecting\u2026";
    host.innerHTML = '<p class="muted">Crunching season averages for both rosters\u2026</p>';
    buildProjection(game).then(function (data) {
      state.cache[gameId] = data;
      btn.disabled = false; btn.textContent = "Hide projection";
      renderProjection(gameId, data);
    }).catch(function () {
      btn.disabled = false; btn.textContent = "Project box score";
      host.innerHTML = '<p class="muted">Couldn\u2019t build the projection (rate limit or network). Wait a moment and retry.</p>';
    });
  }

  function render() {
    return '' +
      '<section class="section">' +
      '  <h1 class="page-title">Upcoming games & projections</h1>' +
      '  <p class="muted">Player-level projections \u2014 points, rebounds, assists, steals, blocks, turnovers and threes \u2014 ' +
      '  built from each player\u2019s season stats.</p>' +
      NBA.app.connectBanner("games") +
      '  <div id="gamesHost"><p class="muted">Loading\u2026</p></div>' +
      '</section>';
  }

  function afterRender() {
    var host = document.getElementById("gamesHost");
    if (!host) return;
    if (!api.hasLiveApi()) {
      host.innerHTML = '<div class="card note"><p><strong>Live data required.</strong></p>' +
        '<p class="muted">Click <strong>\u26A1 Connect</strong> (top right) to add a free API key. Then this page lists ' +
        'upcoming games and projects a full box score for every player on both teams.</p></div>';
      return;
    }
    host.innerHTML = '<p class="muted">Finding upcoming games\u2026</p>';
    api.upcomingGames(7).then(function (games) {
      state.games = games;
      if (!games.length) {
        host.innerHTML = '<div class="card note"><p class="muted">No upcoming games found right now (the season may be on a break). ' +
          'Check back during the regular season or playoffs.</p></div>';
        return;
      }
      host.innerHTML = '<div class="games-list">' + games.map(gameCard).join("") + '</div>';
      host.querySelectorAll("[data-project]").forEach(function (btn) {
        btn.addEventListener("click", function () { onProjectClick(btn.getAttribute("data-project"), btn); });
      });
    });
  }

  return { render: render, afterRender: afterRender };
})();
