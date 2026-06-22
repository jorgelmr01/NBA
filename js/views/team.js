// Team page with a year-by-year timeline slider. Attaches to NBA.views.team.
window.NBA = window.NBA || {};
window.NBA.views = window.NBA.views || {};

window.NBA.views.team = (function () {
  var util = NBA.util;
  var image = NBA.image;

  var state = { team: null, year: null };

  // Players associated with this team who were active in a given year.
  // Note: the generated index stores a player's current team only, so this is
  // an approximation (legends carry full multi-team arrays). Capped for size.
  var ROSTER_CAP = 30;
  function rosterFor(team, year) {
    return (NBA.players || []).filter(function (p) {
      var inSpan = (p.from || 0) <= year && (p.to || 9999) >= year;
      var onTeam = (p.teams || []).indexOf(team.abbr) >= 0;
      return inSpan && onTeam;
    }).sort(function (a, b) {
      return (b.isLegend - a.isLegend) || (b.isHOF - a.isHOF) || a.name.localeCompare(b.name);
    }).slice(0, ROSTER_CAP);
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
    var roster = rosterFor(team, year);

    var resultHtml = result
      ? '<span class="badge ' + result.cls + '">' + result.label + '</span>'
      : (rec ? '<span class="badge">' + util.esc(rec.result) + '</span>' : '<span class="badge muted">No bundled result</span>');

    var recordHtml = rec
      ? '<div class="stat"><span class="stat__num">' + rec.wins + '\u2013' + rec.losses + '</span><span class="stat__lbl">Record</span></div>'
      : '<div class="stat"><span class="stat__num">\u2014</span><span class="stat__lbl">Record (add via data/API)</span></div>';

    var rosterHtml = roster.length
      ? roster.map(function (p) {
          var isRookie = p.draft && p.draft.year === year;
          var tag = isRookie ? '<span class="tag tag--rookie">Rookie</span>'
            : (p.isLegend ? '<span class="tag tag--legend">Legend</span>' : (p.isHOF ? '<span class="tag tag--hof">HOF</span>' : ''));
          return '<a class="roster__item" href="#/player/' + p.id + '">' +
            image.avatarHtml(p, "sm") +
            '<span class="roster__name">' + util.esc(p.name) + '</span>' +
            '<span class="roster__pos">' + util.esc(p.positions || '') + '</span>' + tag +
            '</a>';
        }).join("")
      : '<p class="muted">No notable players in the bundled index for ' + util.seasonLabel(year) + '. ' +
        'Run the data generator or add an API key to see full rosters.</p>';

    return '' +
      '<div class="timeline__year">' +
      '  <h3>' + util.seasonLabel(year) + ' season</h3>' + resultHtml +
      '</div>' +
      '<div class="timeline__stats">' +
      recordHtml +
      '  <div class="stat"><span class="stat__num">' + champs + '</span><span class="stat__lbl">Titles through ' + year + '</span></div>' +
      '</div>' +
      (rec && rec.notes ? '<p class="timeline__notes">' + util.esc(rec.notes) + (rec.coach ? ' \u00B7 Coach: ' + util.esc(rec.coach) : '') + '</p>' : '') +
      '<h4 class="timeline__rosterTitle">Notable players</h4>' +
      '<div class="roster">' + rosterHtml + '</div>';
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
