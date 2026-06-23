// Upcoming games + player-level projections. Attaches to NBA.views.games.
//
// Projections run through the NBA.projection multi-factor model: a season-
// average baseline adjusted for home court, venue altitude, opponent defense,
// game pace, rest (back-to-backs) and injuries (OUT players are removed and
// their minutes/usage redistributed to available teammates). Every adjustment
// is shown to the user so the projection is fully explainable.
window.NBA = window.NBA || {};
window.NBA.views = window.NBA.views || {};

window.NBA.views.games = (function () {
  var util = NBA.util;
  var api = NBA.api;
  var P = NBA.projection;

  var state = { games: [], cache: {} };

  // ---- data orchestration ----------------------------------------------
  // Build a full multi-factor projection for a game. Pulls rosters + season
  // averages (required) and team game logs + injuries (best-effort context),
  // then runs the NBA.projection model. Resolves to a structured result.
  function buildProjection(game) {
    var season = game.season; // balldontlie season start year
    var homeT = game.home_team, visT = game.visitor_team;
    var gameDate = new Date(game.datetime || game.date);

    return Promise.all([api.teamRoster(homeT.id), api.teamRoster(visT.id)]).then(function (rosters) {
      var home = rosters[0], visitor = rosters[1];
      var ids = home.concat(visitor).map(function (p) { return p.id; });
      return api.seasonAveragesMulti(ids, season).then(function (avgMap) {
        var missing = ids.filter(function (id) { return !avgMap[id]; });
        var fb = missing.length ? api.seasonAveragesMulti(missing, season - 1) : Promise.resolve({});
        return fb.then(function (prevMap) {
          // Context signals — degrade gracefully if rate-limited/unavailable.
          return Promise.all([
            api.teamSeasonGames(homeT.id, season).catch(function () { return []; }),
            api.teamSeasonGames(visT.id, season).catch(function () { return []; }),
            api.playerInjuries([homeT.id, visT.id]).catch(function () { return null; })
          ]).then(function (extra) {
            var homeSum = P.summarizeGames(extra[0], homeT.id, gameDate);
            var visSum = P.summarizeGames(extra[1], visT.id, gameDate);
            var league = P.leagueAverages([homeSum, visSum]);
            var injuries = extra[2];
            var injByPlayer = {};
            (Array.isArray(injuries) ? injuries : []).forEach(function (inj) {
              var pid = inj.player && inj.player.id;
              if (pid != null) injByPlayer[pid] = {
                status: inj.status, sev: P.injurySeverity(inj.status),
                desc: inj.description || inj.return_date || ""
              };
            });

            function buildSide(roster, isHome, ownSum, oppSum, teamObj) {
              var ctx = P.teamContext({
                isHome: isHome, venueAbbr: homeT.abbreviation,
                ownSummary: ownSum, oppSummary: oppSum, league: league, gameDate: gameDate
              });
              var lines = [], outLines = [], out = [];
              roster.forEach(function (p) {
                var base = P.lineFromAvg(avgMap[p.id] || prevMap[p.id]);
                if (!base || base.min < 8) return; // skip deep bench / no data
                var entry = {
                  id: p.id, name: p.first_name + " " + p.last_name, pos: p.position || "",
                  proj: P.applyContext(base, ctx), fromPrev: !avgMap[p.id],
                  injury: injByPlayer[p.id] || null
                };
                if (entry.injury && entry.injury.sev === "out") { out.push(entry); outLines.push(entry); }
                else lines.push(entry);
              });
              lines.sort(function (a, b) { return b.proj.min - a.proj.min; });
              P.redistributeInjuries(lines, outLines);
              lines = lines.slice(0, 10);
              return { team: teamObj, lines: lines, out: out, factors: ctx.factors };
            }

            return {
              season: season,
              home: buildSide(home, true, homeSum, visSum, homeT),
              visitor: buildSide(visitor, false, visSum, homeSum, visT),
              injuryAvailable: injuries !== null
            };
          });
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

  function fmtPct(pct) {
    return (pct >= 0 ? "+" : "") + (pct * 100).toFixed(1) + "%";
  }

  function chips(factors) {
    if (!factors || !factors.length) return "";
    return '<div class="proj__factors">' + factors.map(function (f) {
      var cls = f.pct >= 0 ? "chip chip--up" : "chip chip--down";
      return '<span class="' + cls + '">' + util.esc(f.label) + ' ' + fmtPct(f.pct) + '</span>';
    }).join("") + '</div>';
  }

  function injuryNote(side) {
    if (!side.out || !side.out.length) return "";
    var names = side.out.map(function (o) {
      return '<span class="inj-out">' + util.esc(o.name) + ' <em>(' + util.esc(o.injury.status || "Out") + ')</em></span>';
    }).join("");
    return '<p class="proj__injuries">\uD83E\uDE79 Out: ' + names + ' \u2014 minutes & usage redistributed.</p>';
  }

  function teamTotal(side) {
    return side.lines.reduce(function (s, l) { return s + l.proj.pts; }, 0);
  }

  function projTable(side) {
    var rows = side.lines.map(function (l) {
      var p = l.proj;
      var tags = (l.fromPrev ? ' <span class="tag">prev yr</span>' : '') +
        (l.boosted ? ' <span class="tag tag--rookie">usage \u2191</span>' : '') +
        (l.injury && l.injury.sev === "questionable" ? ' <span class="tag tag--q">GTD</span>' : '');
      return '<tr' + (l.boosted ? ' class="is-boosted"' : '') + '>' +
        '<td class="proj__name"><a href="#/player/' + l.id + '">' + util.esc(l.name) + '</a>' + tags + '</td>' +
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
    var head = '<tr><th>Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TOV</th><th>3PM</th></tr>';
    return '<div class="proj__team">' +
      '<h4 class="proj__title">' + util.esc(side.team.full_name) +
      ' <span class="proj__score">~' + Math.round(teamTotal(side)) + ' pts</span></h4>' +
      chips(side.factors) + injuryNote(side) +
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
    var hp = teamTotal(data.home), vp = teamTotal(data.visitor);
    var pick = hp >= vp
      ? { name: data.home.team.full_name, hi: hp, lo: vp }
      : { name: data.visitor.team.full_name, hi: vp, lo: hp };
    var margin = (pick.hi - pick.lo);
    var conf = margin >= 8 ? "strong" : margin >= 3 ? "lean" : "toss-up";
    var injNote = data.injuryAvailable
      ? ""
      : '<span> Injury feed unavailable on this API plan, so OUT players aren\u2019t auto-removed.</span>';

    host.innerHTML =
      '<div class="proj__verdict">' +
      '  <span class="proj__pick">Projected winner: <strong>' + util.esc(pick.name) + '</strong></span>' +
      '  <span class="proj__line">' + Math.round(pick.hi) + '\u2013' + Math.round(pick.lo) +
      ' &middot; ' + conf + ' (' + (margin >= 0 ? "+" : "") + margin.toFixed(0) + ')</span>' +
      '</div>' +
      projTable(data.visitor) + projTable(data.home) +
      '<p class="muted proj__method"><strong>Model:</strong> ' + (data.season + 1) + ' season averages adjusted for ' +
      'home court, venue altitude, opponent defense, pace, rest (back-to-backs) and injuries (OUT players removed, ' +
      'their minutes & production redistributed to available teammates). Percentages on each chip show that factor\u2019s ' +
      'effect on output.' + injNote + '</p>';
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
    host.innerHTML = '<p class="muted">Running the model \u2014 rosters, opponent defense, pace, rest and injuries\u2026 ' +
      '<span class="muted">(several API calls; the free tier is rate-limited, so this can take a few seconds).</span></p>';
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
      '  from a model that weighs <strong>home court, altitude, opponent defense, pace, rest and injuries</strong>. ' +
      '  Every adjustment is shown so you can see exactly why each line moves.</p>' +
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
