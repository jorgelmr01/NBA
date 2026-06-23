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
      '    <a href="#/games" data-nav="/games">Games</a>' +
      '    <a href="#/compare" data-nav="/compare">Compare</a>' +
      '  </nav>' +
      '  <div class="topbar__right">' + favHtml +
      '    <button class="btn btn--ghost" id="settingsBtn" title="' + (NBA.api.hasLiveApi() ? 'Live data connected' : 'Connect live data') + '">' +
      (NBA.api.hasLiveApi() ? '<span class="dot" style="background:#22c55e"></span> Live' : '⚡ Connect') +
      '</button>' +
      '  </div>' +
      '</header>';
  }

  function mountHeader() {
    var host = document.getElementById("header");
    host.innerHTML = buildHeader();
    var sb = document.getElementById("settingsBtn");
    if (sb) sb.addEventListener("click", openConnect);
  }

  // ---- Connect-data modal (no terminal needed) -------------------------
  function closeModal() {
    var m = document.getElementById("modalHost");
    if (m) m.remove();
  }

  // Full-screen modal explaining how to enable live, extensive per-game data
  // by pasting a free balldontlie API key. Includes a one-click connection test.
  function openConnect() {
    closeModal();
    var connected = NBA.api.hasLiveApi();
    var current = NBA.store.getApiKey() || "";
    var host = document.createElement("div");
    host.id = "modalHost";
    host.className = "modal";
    host.innerHTML =
      '<div class="modal__backdrop" data-close="1"></div>' +
      '<div class="modal__card" role="dialog" aria-modal="true" aria-label="Connect live data">' +
      '  <button class="modal__x" data-close="1" aria-label="Close">\u2715</button>' +
      '  <h2 class="modal__title">Connect live NBA data</h2>' +
      '  <p class="muted">This app can pull <strong>extensive live data</strong> \u2014 full season averages and a ' +
      '  <strong>game-by-game breakdown</strong> (points, rebounds, assists, steals, blocks, shooting splits and more) ' +
      '  for the season you select on any player. It uses the free <strong>balldontlie</strong> API. No terminal needed.</p>' +
      '  <ol class="modal__steps">' +
      '    <li>Open <a href="https://app.balldontlie.io/" target="_blank" rel="noopener">app.balldontlie.io</a> and create a free account.</li>' +
      '    <li>Copy your <strong>API key</strong> from the dashboard.</li>' +
      '    <li>Paste it below and press <strong>Connect</strong>.</li>' +
      '  </ol>' +
      '  <label class="modal__label" for="apiKeyInput">balldontlie API key</label>' +
      '  <input id="apiKeyInput" class="input" type="text" autocomplete="off" spellcheck="false" placeholder="paste key here" value="' + NBA.util.esc(current) + '">' +
      '  <div id="connectStatus" class="modal__status' + (connected ? ' is-ok' : '') + '">' +
      (connected ? '\u2713 A key is saved. Test or update it below.' : 'Not connected \u2014 the app is using bundled data only.') +
      '  </div>' +
      '  <div class="modal__actions">' +
      '    <button class="btn btn--primary" id="connectSave">Connect</button>' +
      '    <button class="btn btn--ghost" id="connectRemove">Remove key</button>' +
      '  </div>' +
      '  <p class="muted modal__fine">Your key is stored only in this browser (localStorage). Free tier is rate-limited, so data loads a season at a time.</p>' +
      '</div>';
    document.body.appendChild(host);

    host.addEventListener("click", function (e) {
      if (e.target.getAttribute("data-close")) closeModal();
    });
    var input = document.getElementById("apiKeyInput");
    var status = document.getElementById("connectStatus");
    input.focus();

    document.getElementById("connectSave").addEventListener("click", function () {
      var key = (input.value || "").trim();
      if (!key) { status.className = "modal__status is-err"; status.textContent = "Please paste a key first."; return; }
      NBA.store.setApiKey(key);
      status.className = "modal__status"; status.textContent = "Testing connection\u2026";
      NBA.api.testKey().then(function (res) {
        if (res.ok) {
          status.className = "modal__status is-ok";
          status.textContent = "\u2713 Connected! Reloading with live data\u2026";
          setTimeout(function () { location.reload(); }, 600);
        } else if (res.error === "bad-key") {
          status.className = "modal__status is-err";
          status.textContent = "That key was rejected (401). Double-check it and try again.";
        } else if (res.error === "rate-limited") {
          status.className = "modal__status is-err";
          status.textContent = "Rate limited (429) \u2014 the key works but wait a minute and retry.";
        } else {
          status.className = "modal__status is-err";
          status.textContent = "Couldn\u2019t reach the API (" + (res.error || "error") + "). Check your connection.";
        }
      });
    });
    document.getElementById("connectRemove").addEventListener("click", function () {
      NBA.store.setApiKey(null);
      try { localStorage.removeItem("nba.bdlTeams"); } catch (e) {}
      status.className = "modal__status"; status.textContent = "Key removed. Reloading\u2026";
      setTimeout(function () { location.reload(); }, 500);
    });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { closeModal(); document.removeEventListener("keydown", esc); }
    });
  }

  // Reusable banner prompting the user to connect live data. `context` tailors
  // the message. Returns an HTML string; clicking opens the connect modal.
  function connectBanner(context) {
    if (NBA.api.hasLiveApi()) return "";
    var msg = context === "team"
      ? "Connect live data to see full rosters and per-player roles for any season."
      : "Connect live data for this player\u2019s full season averages and a game-by-game breakdown.";
    return '<div class="connect-banner">' +
      '<div><strong>\u26A1 More data available</strong><p class="muted">' + msg + '</p></div>' +
      '<button class="btn btn--primary" onclick="NBA.app.openConnect()">Connect data</button>' +
      '</div>';
  }

  function registerRoutes() {
    router.on("/", function () { render(views.home.render()); });
    router.on("/teams", function () { render(views.teams.render()); });
    router.on("/team/:id/:year?", function (p) { render(views.team.render(p.id, p.year)); views.team.afterRender && views.team.afterRender(); });
    router.on("/players", function () { render(views.players.render()); views.players.afterRender && views.players.afterRender(); });
    router.on("/player/:id", function (p) { render(views.player.render(p.id)); views.player.afterRender && views.player.afterRender(p.id); });
    router.on("/games", function () { render(views.games.render()); views.games.afterRender && views.games.afterRender(); });
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

  return { start: start, render: render, mountHeader: mountHeader, openConnect: openConnect, connectBanner: connectBanner };
})();

document.addEventListener("DOMContentLoaded", function () { NBA.app.start(); });
