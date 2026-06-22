// Player profile: photo, bio, per-season stats table. Attaches to NBA.views.player.
window.NBA = window.NBA || {};
window.NBA.views = window.NBA.views || {};

window.NBA.views.player = (function () {
  var util = NBA.util;
  var image = NBA.image;

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

      '<section class="section">' +
      '  <h2 class="section__title">Season-by-season stats</h2>' +
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

  function afterRender(id) {
    var host = document.getElementById("statsHost");
    if (!host) return;
    NBA.api.loadLocalPlayerStats(id).then(function (data) {
      if (data && data.seasons && data.seasons.length) {
        var reg = data.seasons.filter(function (s) { return s.type !== "playoffs"; });
        var po = data.seasons.filter(function (s) { return s.type === "playoffs"; });
        host.innerHTML = statsTable(reg, "Regular season") + statsTable(po, "Playoffs");
      } else {
        host.innerHTML = '<div class="card note">' +
          '<p><strong>No bundled season stats for this player yet.</strong></p>' +
          '<p class="muted">Run <code>tools/generate-players</code> to download every player\u2019s full per-season history, ' +
          'or open their official profile above for complete stats.</p>' +
          '</div>';
      }
    });
  }

  return { render: render, afterRender: afterRender };
})();
