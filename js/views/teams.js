// Teams grid view with conference/division filter + search.
// Attaches to NBA.views.teams.
window.NBA = window.NBA || {};
window.NBA.views = window.NBA.views || {};

window.NBA.views.teams = (function () {
  var util = NBA.util;

  function teamCard(t) {
    var rings = (t.championships || []).length;
    var fg = util.contrastColor(t.colors.primary);
    return '<a class="team-card" href="#/team/' + t.id + '" ' +
      'style="--primary:' + t.colors.primary + ';--secondary:' + t.colors.secondary + ';--fg:' + fg + '">' +
      '  <div class="team-card__crest">' + util.esc(t.abbr) + '</div>' +
      '  <div class="team-card__body">' +
      '    <h3>' + util.esc(t.fullName) + '</h3>' +
      '    <p class="muted">' + util.esc(t.conference) + ' · ' + util.esc(t.division) + '</p>' +
      '    <p class="team-card__rings">' + (rings ? rings + ' championship' + (rings > 1 ? 's' : '') + ' \uD83C\uDFC6' : 'No titles yet') + '</p>' +
      '  </div>' +
      '</a>';
  }

  function render() {
    var html = '' +
      '<section class="section">' +
      '  <div class="section__head">' +
      '    <h2 class="section__title">All 30 teams</h2>' +
      '    <div class="filters">' +
      '      <input id="teamSearch" class="input" type="search" placeholder="Search teams..." aria-label="Search teams">' +
      '      <select id="confFilter" class="input" aria-label="Filter by conference">' +
      '        <option value="">All conferences</option>' +
      '        <option value="East">Eastern</option>' +
      '        <option value="West">Western</option>' +
      '      </select>' +
      '    </div>' +
      '  </div>' +
      '  <div id="teamGrid" class="grid team-grid"></div>' +
      '  <p id="teamEmpty" class="empty hidden">No teams match your filters.</p>' +
      '</section>';

    // Defer wiring until the DOM is in place.
    setTimeout(wire, 0);
    return html;
  }

  function wire() {
    var search = document.getElementById("teamSearch");
    var conf = document.getElementById("confFilter");
    var grid = document.getElementById("teamGrid");
    var empty = document.getElementById("teamEmpty");
    if (!grid) return;

    function apply() {
      var q = (search.value || "").toLowerCase().trim();
      var c = conf.value;
      var list = (NBA.teams || []).filter(function (t) {
        var matchesQ = !q || (t.fullName + " " + t.city + " " + t.name + " " + t.abbr).toLowerCase().indexOf(q) >= 0;
        var matchesC = !c || t.conference === c;
        return matchesQ && matchesC;
      }).sort(function (a, b) { return a.fullName.localeCompare(b.fullName); });

      grid.innerHTML = list.map(teamCard).join("");
      empty.classList.toggle("hidden", list.length > 0);
    }

    search.addEventListener("input", apply);
    conf.addEventListener("change", apply);
    apply();
  }

  return { render: render };
})();
