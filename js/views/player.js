// Player profile: photo, bio, per-season stats table. Attaches to NBA.views.player.
window.NBA = window.NBA || {};
window.NBA.views = window.NBA.views || {};

window.NBA.views.player = (function () {
  var util = NBA.util;
  var image = NBA.image;

  var state = { id: null, name: "", local: null, season: null };

  function findInIndex(id) {
    return (NBA.players || []).find(function (p) { return String(p.id) === String(id); });
  }

  function accoladesHtml(p) {
    if (!p.accolades || !p.accolades.length) return "";
    return '<ul class="accolades">' + p.accolades.map(function (a) {
      return '<li>' + util.esc(a) + '</li>';
    }).join("") + '</ul>';
  }

  function draftHtml(p) {
    if (!p.draft) return '<p class="muted">Draft: undrafted / unknown</p>';
    var d = p.draft;
    return '<p class="muted">Drafted ' + d.year + ' · Round ' + d.round + ', Pick ' + d.pick +
      (d.teamAbbr ? ' by ' + util.esc(d.teamAbbr) : '') + '</p>';
  }

  function render(id) {
    var p = findInIndex(id);
    var name = p ? p.name : "Player #" + id;
    var subtitle = p
      ? (p.positions || '') + ' · ' + (p.teams || []).join(', ') + ' · ' + p.from + '\u2013' + p.to
      : 'Live / external player';
    var statusTag = p
      ? (p.status === "active" ? '<span class="tag tag--active">Active</span>'
        : '<span class="tag">Retired</span>') +
        (p.isHOF ? '<span class="tag tag--hof">Hall of Fame</span>' : '') +
        (p.isLegend ? '<span class="tag tag--legend">Legend</span>' : '')
      : '';

    var avatar = image.avatarHtml(p || { id: id, name: name, teams: [] }, "lg");

    var careerHtml = (p && p.career)
      ? '<div class="career">' +
        '<div class="stat"><span class="stat__num">' + util.num(p.career.ppg, 1) + '</span><span class="stat__lbl">PPG</span></div>' +
        '<div class="stat"><span class="stat__num">' + util.num(p.career.rpg, 1) + '</span><span class="stat__lbl">RPG</span></div>' +
        '<div class="stat"><span class="stat__num">' + util.num(p.career.apg, 1) + '</span><span class="stat__lbl">APG</span></div>' +
        '</div>'
      : '';

    return '' +
      '<section class="player-hero">' +
      '  <div class="player-hero__photo">' + avatar + '</div>' +
      '  <div class="player-hero__info">' +
      '    <h1>' + util.esc(name) + '</h1>' +
      '    <p class="muted">' + util.esc(subtitle) + '</p>' +
      '    <div class="player-hero__tags">' + statusTag + '</div>' +
      (p ? draftHtml(p) : '') +
      '    <p class="player-hero__links">' +
      '      <a class="btn btn--ghost" href="' + image.officialPageUrl(id) + '" target="_blank" rel="noopener">NBA.com profile \u2197</a>' +
      '      <a class="btn btn--ghost" href="' + image.bbrefSearchUrl(name) + '" target="_blank" rel="noopener">Basketball-Reference \u2197</a>' +
      '    </p>' +
      '  </div>' +
      '</section>' +

      (p ? accoladesHtml(p) : '') +
      careerHtml +
      NBA.app.connectBanner("player") +

      '<section class="section">' +
      '  <div class="section__head">' +
      '    <h2 class="section__title">Season explorer</h2>' +
      '    <div class="filters">' +
      '      <label class="season-pick"><span class="muted">Season</span>' +
      '        <select id="seasonSelect" class="input"><option>\u2026</option></select>' +
      '      </label>' +
      '    </div>' +
      '  </div>' +
      '  <div id="seasonHost"><p class="muted">Loading\u2026</p></div>' +
      '</section>' +

      '<section class="section">' +
      '  <h2 class="section__title">Career: season-by-season</h2>' +
      '  <div id="statsHost"><p class="muted">Loading stats\u2026</p></div>' +
      '</section>';
  }

  function statsTable(rows, title) {
    if (!rows || !rows.length) return "";
    var head = '<tr><th>Season</th><th>Team</th><th>GP</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>FG%</th><th>3P%</th><th>FT%</th></tr>';
    var body = rows.map(function (s) {
      var team = util.teamById(s.teamId);
      var abbr = team ? team.abbr : (s.teamAbbr || '');
      return '<tr>' +
        '<td>' + util.seasonLabel(s.season) + '</td>' +
        '<td>' + util.esc(abbr) + '</td>' +
        '<td>' + util.num(s.gp) + '</td>' +
        '<td>' + util.num(s.min, 1) + '</td>' +
        '<td>' + util.num(s.pts, 1) + '</td>' +
        '<td>' + util.num(s.reb, 1) + '</td>' +
        '<td>' + util.num(s.ast, 1) + '</td>' +
        '<td>' + util.num(s.stl, 1) + '</td>' +
        '<td>' + util.num(s.blk, 1) + '</td>' +
        '<td>' + util.num(s.fg_pct, 3) + '</td>' +
        '<td>' + util.num(s.fg3_pct, 3) + '</td>' +
        '<td>' + util.num(s.ft_pct, 3) + '</td>' +
        '</tr>';
    }).join("");
    return '<h3 class="stats__title">' + util.esc(title) + '</h3>' +
      '<div class="table-wrap"><table class="stats-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  // ---- season helpers ---------------------------------------------------
  // Regular-season rows for a given year (a traded player has several).
  function rowsForYear(local, year) {
    if (!local || !local.seasons) return [];
    return local.seasons.filter(function (s) {
      return s.type !== "playoffs" && s.season === year;
    });
  }

  // The row that best represents the whole season (TOT if traded, else the
  // single team row), plus the primary team id for relevance lookups.
  function seasonSummary(local, year) {
    var rows = rowsForYear(local, year);
    if (!rows.length) return null;
    var tot = rows.find(function (r) { return r.teamAbbr === "TOT"; });
    var teamRows = rows.filter(function (r) { return r.teamAbbr !== "TOT"; });
    var primary = teamRows.slice().sort(function (a, b) { return (b.gp || 0) - (a.gp || 0); })[0] || rows[0];
    return { display: tot || primary, primaryTeamId: primary && primary.teamId, teams: teamRows };
  }

  // List of seasons (end years) to offer in the picker, newest first.
  function seasonOptions(local, p) {
    var years = {};
    if (local && local.seasons) {
      local.seasons.forEach(function (s) { if (s.type !== "playoffs" && s.season) years[s.season] = 1; });
    }
    var list = Object.keys(years).map(Number);
    if (!list.length && p && p.from && p.to) {
      for (var y = p.to; y >= p.from; y--) list.push(y);
    }
    return list.sort(function (a, b) { return b - a; });
  }

  // ---- relevance / role -------------------------------------------------
  function roleLabel(mpg, scoreRank, exp) {
    var base;
    if (mpg >= 30 && scoreRank <= 2) base = "Franchise cornerstone";
    else if (mpg >= 28) base = "Key player";
    else if (mpg >= 22) base = "Starter";
    else if (mpg >= 14) base = "Rotation player";
    else if (mpg > 0) base = "Bench / depth";
    else base = "Limited role";
    return base;
  }

  function relevanceHtml(local, year) {
    var sum = seasonSummary(local, year);
    if (!sum) return "";
    var teamId = sum.primaryTeamId;
    var ts = (NBA.teamSeasons && NBA.teamSeasons[String(teamId)] && NBA.teamSeasons[String(teamId)][String(year)]) || null;
    var team = util.teamById(teamId);
    var teamName = team ? team.fullName : (sum.display.teamAbbr || "team");
    var mpg = Number(sum.display.min) || 0;
    var pts = Number(sum.display.pts) || 0;

    var roleNote = "", rankNote = "", growth = "";
    if (ts && ts.length) {
      var byMin = ts.slice().sort(function (a, b) { return (b.min || 0) - (a.min || 0); });
      var byPts = ts.slice().sort(function (a, b) { return (b.pts || 0) - (a.pts || 0); });
      var idxMin = byMin.findIndex(function (e) { return String(e.id) === String(local.id); });
      var idxPts = byPts.findIndex(function (e) { return String(e.id) === String(local.id); });
      var minRank = idxMin >= 0 ? idxMin + 1 : null;
      var ptsRank = idxPts >= 0 ? idxPts + 1 : null;
      var me = ts.find(function (e) { return String(e.id) === String(local.id); });
      var exp = me ? me.exp : null;
      var role = roleLabel(mpg, ptsRank || 99, exp);
      roleNote = '<span class="role-pill role-pill--key">' + util.esc(role) + '</span>';
      if (exp === 0) growth = '<span class="role-pill role-pill--growth">Rookie season</span>';
      else if (exp !== null && exp <= 2) growth = '<span class="role-pill role-pill--growth">Young core (yr ' + (exp + 1) + ')</span>';
      rankNote = 'On the <strong>' + util.esc(util.seasonLabel(year)) + ' ' + util.esc(teamName) + '</strong>, ranked ' +
        (ptsRank ? '<strong>#' + ptsRank + '</strong> in scoring' : '') +
        (minRank ? (ptsRank ? ' and ' : '') + '<strong>#' + minRank + '</strong> in minutes' : '') +
        ' among ' + ts.length + ' rostered players.';
    } else {
      var role2 = roleLabel(mpg, 99, null);
      roleNote = '<span class="role-pill role-pill--key">' + util.esc(role2) + '</span>';
      rankNote = 'Played for <strong>' + util.esc(teamName) + '</strong> in ' + util.esc(util.seasonLabel(year)) + '.';
    }

    return '<div class="relevance card">' +
      '<div class="relevance__roles">' + roleNote + growth + '</div>' +
      '<p class="relevance__text">' + rankNote + '</p>' +
      '</div>';
  }

  // ---- averages grid ----------------------------------------------------
  function statCell(num, lbl) {
    return '<div class="mini-stat"><span class="mini-stat__num">' + num + '</span><span class="mini-stat__lbl">' + lbl + '</span></div>';
  }

  // From live balldontlie season_averages (rich) or a local per-game row.
  function averagesGrid(avg, localRow) {
    var cells = [];
    if (avg) {
      cells.push(statCell(util.num(avg.games_played), "GP"));
      cells.push(statCell(util.num(avg.min), "MIN"));
      cells.push(statCell(util.num(avg.pts, 1), "PTS"));
      cells.push(statCell(util.num(avg.reb, 1), "REB"));
      cells.push(statCell(util.num(avg.ast, 1), "AST"));
      cells.push(statCell(util.num(avg.stl, 1), "STL"));
      cells.push(statCell(util.num(avg.blk, 1), "BLK"));
      cells.push(statCell(util.num(avg.turnover, 1), "TOV"));
      cells.push(statCell(util.num(avg.fg_pct, 3), "FG%"));
      cells.push(statCell(util.num(avg.fg3_pct, 3), "3P%"));
      cells.push(statCell(util.num(avg.ft_pct, 3), "FT%"));
      cells.push(statCell(util.num(avg.oreb, 1) + "/" + util.num(avg.dreb, 1), "OR/DR"));
    } else if (localRow) {
      cells.push(statCell(util.num(localRow.gp), "GP"));
      cells.push(statCell(util.num(localRow.min, 1), "MIN"));
      cells.push(statCell(util.num(localRow.pts, 1), "PTS"));
      cells.push(statCell(util.num(localRow.reb, 1), "REB"));
      cells.push(statCell(util.num(localRow.ast, 1), "AST"));
      cells.push(statCell(util.num(localRow.stl, 1), "STL"));
      cells.push(statCell(util.num(localRow.blk, 1), "BLK"));
      cells.push(statCell(util.num(localRow.fg_pct, 3), "FG%"));
      cells.push(statCell(util.num(localRow.fg3_pct, 3), "3P%"));
      cells.push(statCell(util.num(localRow.ft_pct, 3), "FT%"));
    }
    if (!cells.length) return "";
    return '<div class="mini-stats">' + cells.join("") + '</div>';
  }

  // ---- game log ---------------------------------------------------------
  function parseMin(m) {
    if (m === null || m === undefined) return 0;
    if (typeof m === "number") return m;
    var s = String(m);
    if (s.indexOf(":") >= 0) { var a = s.split(":"); return Number(a[0]) + (Number(a[1]) || 0) / 60; }
    return Number(s) || 0;
  }

  function gameLogTable(games, teams) {
    if (!games || !games.length) return "";
    // Sort chronologically.
    games = games.slice().sort(function (a, b) {
      return new Date(a.game.date) - new Date(b.game.date);
    });
    var head = '<tr><th>#</th><th>Date</th><th>Opp</th><th>Result</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th>' +
      '<th>STL</th><th>BLK</th><th>TOV</th><th>FG</th><th>3P</th><th>FT</th></tr>';
    var body = games.map(function (g, i) {
      var teamId = g.team && g.team.id;
      var gm = g.game || {};
      var home = gm.home_team_id === teamId;
      var oppId = home ? gm.visitor_team_id : gm.home_team_id;
      var opp = (teams && teams[oppId]) ? teams[oppId].abbr : "";
      var teamScore = home ? gm.home_team_score : gm.visitor_team_score;
      var oppScore = home ? gm.visitor_team_score : gm.home_team_score;
      var res = (teamScore != null && oppScore != null)
        ? ((teamScore > oppScore ? "W" : "L") + " " + teamScore + "\u2013" + oppScore) : "";
      var resCls = teamScore > oppScore ? "is-win" : "is-loss";
      var date = (gm.date || "").slice(0, 10);
      return '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + util.esc(date) + '</td>' +
        '<td>' + (home ? "vs " : "@ ") + util.esc(opp) + '</td>' +
        '<td class="' + resCls + '">' + util.esc(res) + '</td>' +
        '<td>' + util.esc(String(g.min || "")) + '</td>' +
        '<td><strong>' + util.num(g.pts) + '</strong></td>' +
        '<td>' + util.num(g.reb) + '</td>' +
        '<td>' + util.num(g.ast) + '</td>' +
        '<td>' + util.num(g.stl) + '</td>' +
        '<td>' + util.num(g.blk) + '</td>' +
        '<td>' + util.num(g.turnover) + '</td>' +
        '<td>' + util.num(g.fgm) + '-' + util.num(g.fga) + '</td>' +
        '<td>' + util.num(g.fg3m) + '-' + util.num(g.fg3a) + '</td>' +
        '<td>' + util.num(g.ftm) + '-' + util.num(g.fta) + '</td>' +
        '</tr>';
    }).join("");
    return '<h3 class="stats__title">Game-by-game (' + games.length + ' games)</h3>' +
      '<div class="table-wrap"><table class="stats-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  // ---- season panel orchestration --------------------------------------
  function renderSeasonPanel(year) {
    var host = document.getElementById("seasonHost");
    if (!host) return;
    state.season = year;
    var sum = seasonSummary(state.local, year);
    var localRow = sum ? sum.display : null;

    // Immediate (offline) content: relevance + local averages.
    var base = relevanceHtml(state.local, year) + averagesGrid(null, localRow);

    if (!NBA.api.hasLiveApi()) {
      host.innerHTML = base +
        '<div class="card note"><p><strong>Game-by-game breakdown needs live data.</strong></p>' +
        '<p class="muted">Click <strong>\u26A1 Connect</strong> (top right) to add a free API key and load every game in ' +
        util.esc(util.seasonLabel(year)) + ' \u2014 points, rebounds, assists, steals, blocks and shooting splits per game.</p></div>';
      return;
    }

    host.innerHTML = base + '<p class="muted" id="logLoading">Loading game-by-game data for ' + util.esc(util.seasonLabel(year)) + '\u2026</p>';
    NBA.api.loadPlayerSeason(state.id, state.name, year).then(function (res) {
      if (state.season !== year) return; // user changed season meanwhile
      var rich = relevanceHtml(state.local, year);
      if (res.status === "ok") {
        host.innerHTML = rich + averagesGrid(res.averages, localRow) + gameLogTable(res.games, res.teams);
        if (!res.games.length) {
          host.innerHTML += '<p class="muted">No individual games returned for this season (the player may not have appeared, or data isn\u2019t available this far back).</p>';
        }
      } else if (res.status === "not-found") {
        host.innerHTML = rich + averagesGrid(null, localRow) +
          '<div class="card note"><p class="muted">Couldn\u2019t match this player in the live database. Showing bundled averages above.</p></div>';
      } else if (res.status === "rate-limited") {
        host.innerHTML = rich + averagesGrid(null, localRow) +
          '<div class="card note"><p><strong>Rate limited.</strong> The free API allows a few requests per minute. Wait a moment and re-select the season.</p></div>';
      } else if (res.status === "plan") {
        host.innerHTML = rich + averagesGrid(res.averages, localRow) +
          '<div class="card note"><p class="muted">Your API plan doesn\u2019t include game logs. Season averages shown above.</p></div>';
      } else {
        host.innerHTML = rich + averagesGrid(null, localRow) +
          '<div class="card note"><p class="muted">Couldn\u2019t load live data (' + util.esc(res.status) + '). Bundled averages shown above.</p></div>';
      }
    });
  }

  function afterRender(id) {
    var p = findInIndex(id);
    state.id = id;
    state.name = p ? p.name : "";

    NBA.api.loadLocalPlayerStats(id).then(function (data) {
      state.local = data;
      if (!state.name && data && data.name) state.name = data.name;

      // Career totals table.
      var statsHost = document.getElementById("statsHost");
      if (statsHost) {
        if (data && data.seasons && data.seasons.length) {
          var reg = data.seasons.filter(function (s) { return s.type !== "playoffs"; });
          var po = data.seasons.filter(function (s) { return s.type === "playoffs"; });
          statsHost.innerHTML = statsTable(reg, "Regular season") + statsTable(po, "Playoffs");
        } else {
          statsHost.innerHTML = '<div class="card note">' +
            '<p class="muted">Career season totals aren\u2019t bundled for this player yet. Use the Season explorer above ' +
            '(with live data connected) or the official links for full stats.</p></div>';
        }
      }

      // Season picker.
      var sel = document.getElementById("seasonSelect");
      var opts = seasonOptions(data, p);
      if (sel) {
        if (opts.length) {
          sel.innerHTML = opts.map(function (y) {
            return '<option value="' + y + '">' + util.esc(util.seasonLabel(y)) + '</option>';
          }).join("");
          sel.value = String(opts[0]);
          sel.addEventListener("change", function () { renderSeasonPanel(parseInt(sel.value, 10)); });
          renderSeasonPanel(opts[0]);
        } else {
          sel.innerHTML = '<option>No seasons</option>';
          var host = document.getElementById("seasonHost");
          if (host) host.innerHTML = '<div class="card note"><p class="muted">No season list available for this player.</p></div>';
        }
      }
    });
  }

  return { render: render, afterRender: afterRender };
})();
