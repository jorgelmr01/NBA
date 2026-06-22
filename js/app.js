// App bootstrap: wires the router to views, builds the top nav, and renders
// into #app. Attaches to NBA.app.
window.NBA = window.NBA || {};

window.NBA.app = (function () {
  var router = NBA.router;
  var views = NBA.views;

  function root() { return document.getElementById("app"); }

  // Render an HTML string (or DOM node) into #app.
  function render(content) {
    var el = root();
    if (typeof content === "string") el.innerHTML = content;
    else { el.innerHTML = ""; el.appendChild(content); }
    syncNav();
  }

  // Highlight the active top-nav link based on the current route.
  function syncNav() {
    var path = router.current();
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      var match = a.getAttribute("data-nav");
      var active = (match === "/" && path === "/") || (match !== "/" && path.indexOf(match) === 0);
      a.classList.toggle("is-active", active);
    });
  }

  function buildHeader() {
    var fav = NBA.store.getFavorite();
    var favTeam = fav ? NBA.util.teamById(fav) : null;
    var favHtml = favTeam
      ? '<a class="topbar__fav" href="#/team/' + favTeam.id + '" title="Your favorite team">' +
        '<span class="dot" style="background:' + favTeam.colors.primary + '"></span>' +
        NBA.util.esc(favTeam.abbr) + '</a>'
      : '';
    return '' +
      '<header class="topbar">' +
      '  <a class="topbar__brand" href="#/" data-nav-skip>' +
      '    <span class="topbar__logo">NBA</span><span class="topbar__title">Team Explorer</span>' +
      '  </a>' +
      '  <nav class="topbar__nav">' +
      '    <a href="#/" data-nav="/">Home</a>' +
      '    <a href="#/teams" data-nav="/teams">Teams</a>' +
      '    <a href="#/players" data-nav="/players">Players</a>' +
      '    <a href="#/compare" data-nav="/compare">Compare</a>' +
      '  </nav>' +
      '  <div class="topbar__right">' + favHtml +
      '    <button class="btn btn--ghost" id="settingsBtn" title="Settings">⚙</button>' +
      '  </div>' +
      '</header>';
  }

  function mountHeader() {
    var host = document.getElementById("header");
    host.innerHTML = buildHeader();
    var sb = document.getElementById("settingsBtn");
    if (sb) sb.addEventListener("click", openSettings);
  }

  // Lightweight settings dialog for the optional balldontlie API key.
  function openSettings() {
    var current = NBA.store.getApiKey() || "";
    var key = window.prompt(
      "Optional: paste a free balldontlie API key to enable LIVE current-season stats.\n" +
      "Leave blank to use bundled data only.\nGet one at balldontlie.io.",
      current
    );
    if (key !== null) {
      NBA.store.setApiKey(key.trim());
      router.start && location.reload();
    }
  }

  function registerRoutes() {
    router.on("/", function () { render(views.home.render()); });
    router.on("/teams", function () { render(views.teams.render()); });
    router.on("/team/:id/:year?", function (p) { render(views.team.render(p.id, p.year)); views.team.afterRender && views.team.afterRender(); });
    router.on("/players", function () { render(views.players.render()); views.players.afterRender && views.players.afterRender(); });
    router.on("/player/:id", function (p) { render(views.player.render(p.id)); views.player.afterRender && views.player.afterRender(p.id); });
    router.on("/compare", function () { render(views.compare.render()); views.compare.afterRender && views.compare.afterRender(); });
    router.setNotFound(function () { render('<section class="empty"><h2>Page not found</h2><p><a href="#/">Go home</a></p></section>'); });
  }

  // Merge the curated overlay (data/curated.js) onto the player index so that
  // hand-curated fields (legend/HOF, accolades, draft, career) survive any
  // regeneration of data/player-index.js, and legends always appear.
  function mergeCurated() {
    var curated = NBA.curated || {};
    NBA.players = NBA.players || [];
    var byId = {};
    NBA.players.forEach(function (p) { byId[String(p.id)] = p; });
    Object.keys(curated).forEach(function (id) {
      var overlay = curated[id];
      if (byId[id]) {
        Object.keys(overlay).forEach(function (k) {
          var v = overlay[k];
          if (v !== undefined && v !== null && v !== "") byId[id][k] = v;
        });
      } else {
        var entry = { id: Number(id), isHOF: false, isLegend: false };
        Object.keys(overlay).forEach(function (k) { entry[k] = overlay[k]; });
        NBA.players.push(entry);
        byId[id] = entry;
      }
    });
  }

  function start() {
    mergeCurated();
    mountHeader();
    registerRoutes();
    router.start();
  }

  return { start: start, render: render, mountHeader: mountHeader };
})();

document.addEventListener("DOMContentLoaded", function () { NBA.app.start(); });
