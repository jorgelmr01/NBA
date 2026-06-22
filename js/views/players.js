// Searchable index of all players. Attaches to NBA.views.players.
window.NBA = window.NBA || {};
window.NBA.views = window.NBA.views || {};

window.NBA.views.players = (function () {
  var util = NBA.util;
  var image = NBA.image;

  function row(p) {
    var teams = (p.teams || []).join(", ");
    var status = p.status === "active" ? '<span class="tag tag--active">Active</span>' : '<span class="tag">Retired</span>';
    var hof = p.isHOF ? '<span class="tag tag--hof">HOF</span>' : '';
    var legend = p.isLegend ? '<span class="tag tag--legend">Legend</span>' : '';
    return '<a class="player-row" href="#/player/' + p.id + '">' +
      image.avatarHtml(p, "sm") +
      '<span class="player-row__name">' + util.esc(p.name) + '</span>' +
      '<span class="player-row__meta muted">' + util.esc(p.positions || '') + ' · ' + util.esc(teams) + ' · ' + p.from + '\u2013' + p.to + '</span>' +
      '<span class="player-row__tags">' + status + hof + legend + '</span>' +
      '</a>';
  }

  function render() {
    var html = '' +
      '<section class="section">' +
      '  <div class="section__head">' +
      '    <h2 class="section__title">Players</h2>' +
      '    <div class="filters">' +
      '      <input id="pSearch" class="input" type="search" placeholder="Search any player...">' +
      '      <select id="pStatus" class="input">' +
      '        <option value="">All</option>' +
      '        <option value="active">Active</option>' +
      '        <option value="retired">Retired</option>' +
      '        <option value="hof">Hall of Fame</option>' +
      '        <option value="legend">Legends</option>' +
      '      </select>' +
      '    </div>' +
      '  </div>' +
      '  <p class="muted note" id="pNote"></p>' +
      '  <div id="playerList" class="player-list"></div>' +
      '  <p id="pEmpty" class="empty hidden">No players match. Try the live search (add an API key in \u2699 settings).</p>' +
      '</section>';
    return html;
  }

  function liveSearch(q, listEl) {
    if (!NBA.api.hasLiveApi()) return;
    NBA.api.searchPlayers(q).then(function (players) {
      if (!players || !players.length) return;
      var existing = {};
      (NBA.players || []).forEach(function (p) { existing[p.name.toLowerCase()] = true; });
      var extra = players.filter(function (p) {
        return !existing[((p.first_name || '') + ' ' + (p.last_name || '')).toLowerCase().trim()];
      });
      if (!extra.length) return;
      var note = document.getElementById("pNote");
      if (note) note.textContent = "Including live results from balldontlie.";
      extra.forEach(function (p) {
        var name = ((p.first_name || '') + ' ' + (p.last_name || '')).trim();
        var abbr = p.team && p.team.abbreviation ? [p.team.abbreviation] : [];
        var pseudo = { id: p.id, name: name, positions: p.position || '', teams: abbr, from: '', to: '', status: 'active' };
        listEl.insertAdjacentHTML("beforeend",
          '<a class="player-row" href="https://www.basketball-reference.com/search/search.fcgi?search=' +
          encodeURIComponent(name) + '" target="_blank" rel="noopener">' +
          '<span class="avatar avatar--sm avatar--initials" style="background:#444">' + util.esc(util.initials(name)) + '</span>' +
          '<span class="player-row__name">' + util.esc(name) + '</span>' +
          '<span class="player-row__meta muted">' + util.esc(p.position || '') + ' · ' + util.esc(abbr.join('')) + ' · live</span>' +
          '<span class="player-row__tags"><span class="tag tag--active">Live</span></span>' +
          '</a>');
      });
    });
  }

  function afterRender() {
    var search = document.getElementById("pSearch");
    var status = document.getElementById("pStatus");
    var list = document.getElementById("playerList");
    var empty = document.getElementById("pEmpty");
    if (!list) return;

    var liveTimer = null;

    function apply() {
      var q = (search.value || "").toLowerCase().trim();
      var s = status.value;
      var items = (NBA.players || []).filter(function (p) {
        var mq = !q || p.name.toLowerCase().indexOf(q) >= 0 || (p.teams || []).join(" ").toLowerCase().indexOf(q) >= 0;
        var ms = !s ||
          (s === "active" && p.status === "active") ||
          (s === "retired" && p.status === "retired") ||
          (s === "hof" && p.isHOF) ||
          (s === "legend" && p.isLegend);
        return mq && ms;
      }).sort(function (a, b) {
        // Legends first, then alphabetical, so the unfiltered view is inviting.
        return (b.isLegend - a.isLegend) || a.name.localeCompare(b.name);
      });

      // The full index can be thousands of players; cap rendered rows (and the
      // image requests they trigger) and prompt the user to refine.
      var CAP = 60;
      var shown = items.slice(0, CAP);
      list.innerHTML = shown.map(row).join("");
      empty.classList.toggle("hidden", items.length > 0);

      var note = document.getElementById("pNote");
      if (note) {
        if (!q && !s) note.textContent = "Showing " + shown.length + " of " + items.length + " players. Search by name or filter to find anyone.";
        else if (items.length > CAP) note.textContent = "Showing first " + CAP + " of " + items.length + " matches \u2014 keep typing to narrow down.";
        else note.textContent = items.length + " match" + (items.length === 1 ? "" : "es") + ".";
      }

      if (q && q.length >= 3) {
        if (liveTimer) clearTimeout(liveTimer);
        liveTimer = setTimeout(function () { liveSearch(q, list); }, 350);
      }
    }

    search.addEventListener("input", apply);
    status.addEventListener("change", apply);
    apply();
  }

  return { render: render, afterRender: afterRender };
})();
