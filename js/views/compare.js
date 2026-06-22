// Compare two teams' history at a chosen year. Attaches to NBA.views.compare.
window.NBA = window.NBA || {};
window.NBA.views = window.NBA.views || {};

window.NBA.views.compare = (function () {
  var util = NBA.util;

  function teamOptions(selectedId) {
    return (NBA.teams || []).slice().sort(function (a, b) { return a.fullName.localeCompare(b.fullName); })
      .map(function (t) {
        return '<option value="' + t.id + '"' + (String(t.id) === String(selectedId) ? ' selected' : '') + '>' +
          util.esc(t.fullName) + '</option>';
      }).join("");
  }

  function colHtml(team, year) {
    if (!team) return '<div class="compare__col"><p class="muted">Pick a team</p></div>';
    var champs = util.champsThrough(team, year);
    var totalChamps = (team.championships || []).length;
    var fg = util.contrastColor(team.colors.primary);
    return '<div class="compare__col" style="--primary:' + team.colors.primary + ';--fg:' + fg + '">' +
      '<div class="compare__crest">' + util.esc(team.abbr) + '</div>' +
      '<h3>' + util.esc(team.fullName) + '</h3>' +
      '<div class="stat"><span class="stat__num">' + champs + '</span><span class="stat__lbl">Titles through ' + year + '</span></div>' +
      '<div class="stat"><span class="stat__num">' + totalChamps + '</span><span class="stat__lbl">Titles all-time</span></div>' +
      '<div class="stat"><span class="stat__num">' + team.founded + '</span><span class="stat__lbl">Founded</span></div>' +
      '<p class="muted">' + util.esc(team.conference) + ' · ' + util.esc(team.division) + '</p>' +
      '</div>';
  }

  function render() {
    var teams = NBA.teams || [];
    var a = teams[0], b = teams[1];
    var year = NBA.meta.currentSeason;
    return '' +
      '<section class="section">' +
      '  <h2 class="section__title">Compare franchises</h2>' +
      '  <div class="compare__controls">' +
      '    <select id="cmpA" class="input">' + teamOptions(a && a.id) + '</select>' +
      '    <div class="compare__year">' +
      '      <input id="cmpYear" class="slider" type="range" min="1947" max="' + year + '" value="' + year + '">' +
      '      <output id="cmpYearOut">' + util.seasonLabel(year) + '</output>' +
      '    </div>' +
      '    <select id="cmpB" class="input">' + teamOptions(b && b.id) + '</select>' +
      '  </div>' +
      '  <div id="cmpGrid" class="compare__grid"></div>' +
      '</section>';
  }

  function afterRender() {
    var selA = document.getElementById("cmpA");
    var selB = document.getElementById("cmpB");
    var yr = document.getElementById("cmpYear");
    var out = document.getElementById("cmpYearOut");
    var grid = document.getElementById("cmpGrid");
    if (!grid) return;

    function apply() {
      var year = parseInt(yr.value, 10);
      out.textContent = util.seasonLabel(year);
      grid.innerHTML = colHtml(util.teamById(selA.value), year) + colHtml(util.teamById(selB.value), year);
    }
    selA.addEventListener("change", apply);
    selB.addEventListener("change", apply);
    yr.addEventListener("input", apply);
    apply();
  }

  return { render: render, afterRender: afterRender };
})();
