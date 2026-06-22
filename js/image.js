// Player image helpers: official NBA headshot CDN with graceful fallback
// to an initials avatar. Attaches to NBA.image.
window.NBA = window.NBA || {};

window.NBA.image = (function () {
  var util = NBA.util;

  // Official NBA headshot CDN URL for a given PERSON_ID.
  function headshotUrl(personId) {
    return "https://cdn.nba.com/headshots/nba/latest/1040x760/" + personId + ".png";
  }

  // Official NBA player page (where photo + bio live).
  function officialPageUrl(personId) {
    return "https://www.nba.com/player/" + personId;
  }

  // Basketball-Reference search fallback (covers every player in history).
  function bbrefSearchUrl(name) {
    return "https://www.basketball-reference.com/search/search.fcgi?search=" + encodeURIComponent(name || "");
  }

  // Returns an HTML string for a player avatar. Tries the headshot; on error
  // swaps to an initials avatar. `size` is a CSS class modifier (sm|md|lg).
  function avatarHtml(player, size) {
    var cls = "avatar avatar--" + (size || "md");
    var init = util.initials(player.name);
    var color = player.teams && player.teams.length ? colorFor(player.teams[player.teams.length - 1]) : "#444";
    var fallback = "<span class=\"" + cls + " avatar--initials\" style=\"background:" + color + "\">" + util.esc(init) + "</span>";
    if (!player.id) return fallback;
    var url = headshotUrl(player.id);
    // The img has an onerror that replaces itself with the initials avatar.
    return "<img class=\"" + cls + "\" src=\"" + url + "\" alt=\"" + util.esc(player.name) + "\" loading=\"lazy\" " +
      "onerror=\"this.outerHTML='" + fallback.replace(/'/g, "\\'").replace(/"/g, "&quot;") + "'\">";
  }

  function colorFor(abbr) {
    var t = util.teamByAbbr(abbr);
    return t ? t.colors.primary : "#444";
  }

  return {
    headshotUrl: headshotUrl,
    officialPageUrl: officialPageUrl,
    bbrefSearchUrl: bbrefSearchUrl,
    avatarHtml: avatarHtml
  };
})();
