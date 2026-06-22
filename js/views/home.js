// Home / onboarding view. Attaches to NBA.views.home.
window.NBA = window.NBA || {};
window.NBA.views = window.NBA.views || {};

window.NBA.views.home = (function () {
  var util = NBA.util;

  function primerHtml() {
    return (NBA.meta.primer || []).map(function (p) {
      return '<div class="card primer__item">' +
        '<h3>' + util.esc(p.title) + '</h3>' +
        '<p>' + util.esc(p.body) + '</p>' +
        '</div>';
    }).join("");
  }

  function featuredTeamsHtml() {
    // Show the most-decorated franchises as an inviting starting point.
    var teams = (NBA.teams || []).slice().sort(function (a, b) {
      return (b.championships || []).length - (a.championships || []).length;
    }).slice(0, 6);
    return teams.map(function (t) {
      return '<a class="chip" href="#/team/' + t.id + '" style="--c:' + t.colors.primary + '">' +
        '<span class="chip__abbr">' + util.esc(t.abbr) + '</span>' +
        '<span class="chip__name">' + util.esc(t.fullName) + '</span>' +
        '<span class="chip__rings">' + (t.championships || []).length + ' \u00D7 \uD83C\uDFC6</span>' +
        '</a>';
    }).join("");
  }

  function render() {
    var fav = NBA.store.getFavorite();
    var favTeam = fav ? util.teamById(fav) : null;

    return '' +
      '<section class="hero">' +
      '  <div class="hero__inner">' +
      '    <h1>Get to know the <span class="hl">NBA</span></h1>' +
      '    <p class="hero__sub">Explore all 30 teams and every player in league history — year by year. ' +
      'See rosters, stats, championships, draft picks, and legends.</p>' +
      '    <div class="hero__cta">' +
      '      <a class="btn btn--primary" href="#/teams">Browse all teams</a>' +
      '      <a class="btn" href="#/players">Search players</a>' +
      '    </div>' +
      (favTeam
        ? '    <p class="hero__fav">Your favorite team: <a href="#/team/' + favTeam.id + '">' + util.esc(favTeam.fullName) + '</a></p>'
        : '    <p class="hero__fav muted">Tip: open a team page and tap \u2606 to set your favorite.</p>') +
      '  </div>' +
      '</section>' +

      '<section class="section">' +
      '  <h2 class="section__title">New to basketball? Start here</h2>' +
      '  <div class="primer grid">' + primerHtml() + '</div>' +
      '</section>' +

      '<section class="section">' +
      '  <h2 class="section__title">Most decorated franchises</h2>' +
      '  <div class="chips">' + featuredTeamsHtml() + '</div>' +
      '</section>';
  }

  return { render: render };
})();
