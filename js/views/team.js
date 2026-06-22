// Team page with a year-by-year timeline slider. Attaches to NBA.views.team.
window.NBA = window.NBA || {};
window.NBA.views = window.NBA.views || {};

window.NBA.views.team = (function () {
  var util = NBA.util;
  var image = NBA.image;

  var state = { team: null, year: null };

  // Accurate roster for a franchise + season, from the generated team-season
  // index (data/team-seasons.js). Returns an array of per-game-average entries
  // sorted by minutes, or null if that season isn't in the bundled data.
  function rosterFromData(team, year) {
    var byTeam = NBA.teamSeasons && NBA.teamSeasons[String(team.id)];
    var list = byTeam && byTeam[String(year)];
    return (list && list.length) ? list.slice() : null;
  }

  // Classify a roster into clear groups answering "who were the key players,
  // the supporting cast, and the young players developing for the future?"
  function classifyRoster(roster) {
    var groups = { key: [], support: [], growth: [], depth: [] };
    roster.forEach(function (e) {
      var mpg = e.min || 0;
      var young = (e.exp !== undefined && e.exp !== null && e.exp <= 2);
      if (mpg >= 28) groups.key.push(e);
      else if (young && mpg >= 8) groups.growth.push(e);
      else if (mpg >= 12) groups.support.push(e);
      else groups.depth.push(e);
    });
    // Rank within each group by a production-weighted score.
    Object.keys(groups).forEach(function (k) {
      groups[k].sort(function (a, b) {
        return ((b.min || 0) + (b.pts || 0) * 0.6) - ((a.min || 0) + (a.pts || 0) * 0.6);
      });
    });
    return groups;
  }

  function roleCard(e, badge) {
    var line = util.num(e.min, 1) + ' MPG \u00B7 ' + util.num(e.pts, 1) + ' PPG \u00B7 ' +
      util.num(e.reb, 1) + ' RPG \u00B7 ' + util.num(e.ast, 1) + ' APG';
    return '<a class="role-card" href="#/player/' + e.id + '">' +
      image.avatarHtml({ id: e.id, name: e.name }, "sm") +
      '<span class="role-card__body">' +
      '<span class="role-card__name">' + util.esc(e.name) + (badge || '') + '</span>' +
      '<span class="role-card__line">' + line + '</span>' +
      '</span></a>';
  }

  function roleGroup(title, sub, entries, badgeFn) {
    if (!entries.length) return "";
    var cards = entries.map(function (e) { return roleCard(e, badgeFn ? badgeFn(e) : ""); }).join("");
    return '<div class="role-group">' +
      '<h5 class="role-group__title">' + util.esc(title) + ' <span class="muted">' + util.esc(sub) + '</span></h5>' +
      '<div class="role-cards">' + cards + '</div></div>';
  }

  // Fallback when a season isn't in the bundled data: approximate from the index.
  function fallbackRosterHtml(team, year) {
    var roster = (NBA.players || []).filter(function (p) {
      var inSpan = (p.from || 0) <= year && (p.to || 9999) >= year;
      return (p.teams || []).indexOf(team.abbr) >= 0 && inSpan;
    }).sort(function (a, b) {
      return (b.isLegend - a.isLegend) || (b.isHOF - a.isHOF) || a.name.localeCompare(b.name);
    }).slice(0, 24);

    var note = NBA.api.hasLiveApi()
      ? 'Detailed roster roles for ' + util.seasonLabel(year) + ' aren\u2019t in the bundled snapshot yet.'
      : 'Connect live data (or generate the full snapshot) for exact rosters and player roles.';
    if (!roster.length) return '<p class="muted">' + note + '</p>';
    var cards = roster.map(function (p) {
      var tag = p.isLegend ? '<span class="tag tag--legend">Legend</span>' : (p.isHOF ? '<span class="tag tag--hof">HOF</span>' : '');
      return '<a class="role-card" href="#/player/' + p.id + '">' + image.avatarHtml(p, "sm") +
        '<span class="role-card__body"><span class="role-card__name">' + util.esc(p.name) + tag + '</span>' +
        '<span class="role-card__line muted">' + util.esc(p.positions || '') + '</span></span></a>';
    }).join("");
    return '<p class="muted">' + note + '</p><div class="role-cards">' + cards + '</div>';
  }

  function rosterSectionHtml(team, year) {
    var roster = rosterFromData(team, year);
    if (!roster) return fallbackRosterHtml(team, year);
    var g = classifyRoster(roster);
    var keyBadge = function (e) { return (e.exp !== null && e.exp <= 2) ? '<span class="tag tag--rookie">Rising</span>' : ''; };
    var growthBadge = function (e) { return e.exp === 0 ? '<span class="tag tag--rookie">Rookie</span>' : '<span class="tag tag--active">Yr ' + (e.exp + 1) + '</span>'; };
    return roleGroup("\u2B50 Key players", "stars & main starters", g.key, keyBadge) +
      roleGroup("Supporting cast", "rotation & role players", g.support, null) +
      roleGroup("\uD83C\uDF31 Young & growth", "developing for the future", g.growth, growthBadge) +
      (g.depth.length ? roleGroup("Depth", "limited minutes", g.depth, null) : "");
  }

  function seasonRecordFor(team, year) {
    var list = (NBA.seasons && NBA.seasons[team.id]) || [];
    return list.find(function (s) { return s.year === year; }) || null;
  }

  function resultForYear(team, year) {
    if ((team.championships || []).indexOf(year) >= 0) return { label: "NBA Champion \uD83C\uDFC6", cls: "is-champ" };
    if ((team.runnerUps || []).indexOf(year) >= 0) return { label: "Finals Runner-up", cls: "is-runner" };
    return null;
  }

  function timelinePanel(team, year) {
    var champs = util.champsThrough(team, year);
    var rec = seasonRecordFor(team, year);
    var result = resultForYear(team, year);

    var resultHtml = result
      ? '<span class="badge ' + result.cls + '">' + result.label + '</span>'
      : (rec ? '<span class="badge">' + util.esc(rec.result) + '</span>' : '<span class="badge muted">No bundled result</span>');

    var recordHtml = rec
      ? '<div class="stat"><span class="stat__num">' + rec.wins + '\u2013' + rec.losses + '</span><span class="stat__lbl">Record</span></div>'
      : '<div class="stat"><span class="stat__num">\u2014</span><span class="stat__lbl">Record (add via data/API)</span></div>';

    return '' +
      '<div class="timeline__year">' +
      '  <h3>' + util.seasonLabel(year) + ' season</h3>' + resultHtml +
      '</div>' +
      '<div class="timeline__stats">' +
      recordHtml +
      '  <div class="stat"><span class="stat__num">' + champs + '</span><span class="stat__lbl">Titles through ' + year + '</span></div>' +
      '</div>' +
      (rec && rec.notes ? '<p class="timeline__notes">' + util.esc(rec.notes) + (rec.coach ? ' \u00B7 Coach: ' + util.esc(rec.coach) : '') + '</p>' : '') +
      '<h4 class="timeline__rosterTitle">Who mattered this season</h4>' +
      '<div class="roster-roles">' + rosterSectionHtml(team, year) + '</div>';
  }

  function render(id, yearParam) {
    var team = util.teamById(id);
    if (!team) return '<section class="empty"><h2>Team not found</h2><p><a href="#/teams">Back to teams</a></p></section>';

    var current = NBA.meta.currentSeason;
    var year = parseInt(yearParam, 10);
    if (!year || year < team.founded || year > current) year = current;
    state.team = team;
    state.year = year;

    var fg = util.contrastColor(team.colors.primary);
    var isFav = String(NBA.store.getFavorite()) === String(team.id);
    var rings = (team.championships || []).length;

    var former = (team.formerNames || []).length
      ? '<p class="muted team-hero__former">Formerly: ' + team.formerNames.map(util.esc).join(" · ") + '</p>'
      : '';

    return '' +
      '<section class="team-hero" style="--primary:' + team.colors.primary + ';--secondary:' + team.colors.secondary + ';--fg:' + fg + '">' +
      '  <div class="team-hero__crest">' + util.esc(team.abbr) + '</div>' +
      '  <div class="team-hero__info">' +
      '    <h1>' + util.esc(team.fullName) + '</h1>' +
      '    <p>' + util.esc(team.conference) + ' Conference · ' + util.esc(team.division) + ' Division</p>' +
      '    <p class="muted">Est. ' + team.founded + ' · ' + util.esc(team.arena) + '</p>' + former +
      '    <div class="team-hero__meta">' +
      '      <span class="pill">\uD83C\uDFC6 ' + rings + ' title' + (rings === 1 ? '' : 's') + '</span>' +
      '      <button id="favToggle" class="btn btn--ghost">' + (isFav ? '\u2605 Favorited' : '\u2606 Set favorite') + '</button>' +
      '    </div>' +
      '  </div>' +
      '</section>' +

      NBA.app.connectBanner("team") +

      '<section class="section">' +
      '  <div class="section__head">' +
      '    <h2 class="section__title">Time machine</h2>' +
      '    <div class="timeline__control">' +
      '      <button class="btn btn--ghost" id="yearPrev" aria-label="Previous year">\u25C0</button>' +
      '      <input id="yearSlider" class="slider" type="range" min="' + team.founded + '" max="' + current + '" value="' + year + '" step="1">' +
      '      <button class="btn btn--ghost" id="yearNext" aria-label="Next year">\u25B6</button>' +
      '      <output id="yearOut" class="timeline__out">' + util.seasonLabel(year) + '</output>' +
      '    </div>' +
      '  </div>' +
      '  <div id="timelinePanel" class="card timeline">' + timelinePanel(team, year) + '</div>' +
      '</section>';
  }

  function update(year) {
    state.year = year;
    var panel = document.getElementById("timelinePanel");
    var out = document.getElementById("yearOut");
    var slider = document.getElementById("yearSlider");
    if (panel) panel.innerHTML = timelinePanel(state.team, year);
    if (out) out.textContent = util.seasonLabel(year);
    if (slider) slider.value = year;
  }

  function afterRender() {
    var slider = document.getElementById("yearSlider");
    var prev = document.getElementById("yearPrev");
    var next = document.getElementById("yearNext");
    var fav = document.getElementById("favToggle");
    if (!slider || !state.team) return;

    slider.addEventListener("input", function () { update(parseInt(slider.value, 10)); });
    prev.addEventListener("click", function () { update(Math.max(state.team.founded, state.year - 1)); });
    next.addEventListener("click", function () { update(Math.min(NBA.meta.currentSeason, state.year + 1)); });
    if (fav) fav.addEventListener("click", function () {
      var now = String(NBA.store.getFavorite()) === String(state.team.id);
      NBA.store.setFavorite(now ? null : state.team.id);
      fav.textContent = now ? '\u2606 Set favorite' : '\u2605 Favorited';
      NBA.app.mountHeader();
    });
  }

  return { render: render, afterRender: afterRender };
})();
