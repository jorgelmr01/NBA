// Minimal hash-based router. Attaches to NBA.router.
window.NBA = window.NBA || {};

window.NBA.router = (function () {
  var routes = [];
  var notFound = null;

  // Register a route. Pattern uses :params, e.g. "/team/:id/:year?".
  // A trailing "?" marks an optional segment. Keys are collected left-to-right
  // so they line up with the regex capture groups.
  function on(pattern, handler) {
    var keys = [];
    var regexStr = "^" + pattern.replace(/\/:([A-Za-z0-9_]+)(\?)?/g, function (_, k, opt) {
      keys.push(k);
      return opt ? "(?:/([^/]+))?" : "/([^/]+)";
    }) + "$";
    routes.push({ regex: new RegExp(regexStr), keys: keys, handler: handler });
    return this;
  }

  function setNotFound(fn) { notFound = fn; }

  function current() {
    var h = window.location.hash || "#/";
    return h.replace(/^#/, "") || "/";
  }

  function resolve() {
    var path = current();
    for (var i = 0; i < routes.length; i++) {
      var m = path.match(routes[i].regex);
      if (m) {
        var params = {};
        routes[i].keys.forEach(function (k, idx) { params[k] = m[idx + 1] ? decodeURIComponent(m[idx + 1]) : undefined; });
        window.scrollTo(0, 0);
        return routes[i].handler(params);
      }
    }
    if (notFound) notFound();
  }

  function start() {
    window.addEventListener("hashchange", resolve);
    resolve();
  }

  function go(path) { window.location.hash = path; }

  return { on: on, setNotFound: setNotFound, start: start, go: go, current: current };
})();
