// Multi-factor player projection model. Attaches to NBA.projection.
//
// Philosophy: start from a stable per-game baseline (season averages), then
// apply transparent, bounded multipliers for the things that actually move a
// box score: home court, venue altitude, opponent defense, game pace, rest,
// and injuries (which redistribute minutes and production to available teammates).
//
// Every factor is clamped so no single signal can dominate, and each one is
// reported back so the UI can explain *why* a projection looks the way it does.
window.NBA = window.NBA || {};

window.NBA.projection = (function () {
  // Arena elevation (feet). Only meaningfully high venues alter the model, but
  // the full set is bundled for transparency/education. Keyed by team abbr.
  var VENUE_ALT = {
    DEN: 5280, UTA: 4226, OKC: 1201, PHX: 1086, SAS: 650, MIN: 830, ATL: 1050,
    CHA: 751, IND: 715, CLE: 653, MIL: 617, DET: 600, CHI: 594, DAL: 430,
    MEM: 337, TOR: 250, ORL: 100, POR: 50, HOU: 50, PHI: 39, SAC: 30, BKN: 30,
    NYK: 30, GSW: 13, LAL: 285, LAC: 285, BOS: 20, WAS: 25, MIA: 7, NOP: 3
  };

  // Tunable constants (kept conservative; effects compound multiplicatively).
  var C = {
    HOME_SCORING: 1.025,      // home players score a touch more
    AWAY_SCORING: 0.99,       // road players a touch less
    ALT_THRESHOLD: 4000,      // ft above which visitors fatigue
    ALT_VISITOR: 0.97,        // visitor output penalty at altitude
    DEF_MIN: 0.92, DEF_MAX: 1.08,   // opponent-defense clamp
    PACE_MIN: 0.95, PACE_MAX: 1.06, // pace clamp
    B2B: 0.97,                // back-to-back fatigue
    LONG_REST: 1.01,          // 3+ days rest
    MIN_CAP: 40,              // projected minutes ceiling
    INJURY_TRANSFER: 0.9,     // share of an OUT player's production redistributed
    REL_DEF: 0.5,             // how much defense affects assists (vs scoring)
    LEAGUE_PTS: 114,          // fallbacks if we can't compute live
    LEAGUE_TOTAL: 228
  };

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function avg(arr) { return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : 0; }

  // Convert a balldontlie season_averages object into a clean per-game line.
  function lineFromAvg(a) {
    if (!a) return null;
    return {
      min: Number(a.min) || 0, pts: Number(a.pts) || 0, reb: Number(a.reb) || 0,
      ast: Number(a.ast) || 0, stl: Number(a.stl) || 0, blk: Number(a.blk) || 0,
      tov: Number(a.turnover) || 0, fg3m: Number(a.fg3m) || 0, gp: Number(a.games_played) || 0
    };
  }

  // Summarize a team's season games into scoring/defense/pace + last game date
  // strictly before `beforeDate` (for rest). Returns null if no usable games.
  function summarizeGames(games, teamId, beforeDate) {
    var pf = 0, pa = 0, total = 0, n = 0, last = null;
    (games || []).forEach(function (g) {
      if (g.home_team_score == null || g.visitor_team_score == null) return;
      if (g.home_team_score === 0 && g.visitor_team_score === 0) return; // unplayed
      var isHome = g.home_team.id === teamId;
      var f = isHome ? g.home_team_score : g.visitor_team_score;
      var a = isHome ? g.visitor_team_score : g.home_team_score;
      pf += f; pa += a; total += (f + a); n++;
      var d = new Date(g.date);
      if (beforeDate && d < beforeDate && (!last || d > last)) last = d;
    });
    if (!n) return null;
    return { gp: n, pf: pf / n, pa: pa / n, total: total / n, lastDate: last };
  }

  // League scoring/pace baselines from whatever team summaries we have.
  function leagueAverages(summaries) {
    var s = summaries.filter(Boolean);
    if (!s.length) return { pts: C.LEAGUE_PTS, total: C.LEAGUE_TOTAL };
    return { pts: avg(s.map(function (x) { return x.pf; })) || C.LEAGUE_PTS,
             total: avg(s.map(function (x) { return x.total; })) || C.LEAGUE_TOTAL };
  }

  // Build the set of multipliers + human-readable factors for one team in a
  // matchup. opts: { isHome, venueAbbr, ownSummary, oppSummary, league, gameDate }
  function teamContext(opts) {
    var factors = [];
    var scoring = 1, pace = 1, rest = 1, alt = 1;

    if (opts.isHome) { scoring *= C.HOME_SCORING; factors.push({ label: "Home court", pct: C.HOME_SCORING - 1 }); }
    else { scoring *= C.AWAY_SCORING; factors.push({ label: "On the road", pct: C.AWAY_SCORING - 1 }); }

    var va = VENUE_ALT[opts.venueAbbr] || 0;
    if (!opts.isHome && va >= C.ALT_THRESHOLD) {
      alt *= C.ALT_VISITOR;
      factors.push({ label: "Altitude @ " + opts.venueAbbr + " (" + va.toLocaleString() + " ft)", pct: C.ALT_VISITOR - 1 });
    }

    if (opts.oppSummary && opts.league.pts) {
      var def = clamp(opts.oppSummary.pa / opts.league.pts, C.DEF_MIN, C.DEF_MAX);
      scoring *= def;
      if (Math.abs(def - 1) > 0.005) factors.push({ label: def < 1 ? "Tough opp defense" : "Soft opp defense", pct: def - 1 });
    }

    if (opts.ownSummary && opts.league.total) {
      var pc = clamp(opts.ownSummary.total / opts.league.total, C.PACE_MIN, C.PACE_MAX);
      pace *= pc;
      if (Math.abs(pc - 1) > 0.005) factors.push({ label: pc > 1 ? "Fast pace" : "Slow pace", pct: pc - 1 });
    }

    if (opts.ownSummary && opts.ownSummary.lastDate && opts.gameDate) {
      var days = Math.round((opts.gameDate - opts.ownSummary.lastDate) / 86400000);
      if (days <= 1) { rest *= C.B2B; factors.push({ label: "Back-to-back", pct: C.B2B - 1 }); }
      else if (days >= 3) { rest *= C.LONG_REST; factors.push({ label: days + " days rest", pct: C.LONG_REST - 1 }); }
    }

    var assistScoring = 1 + (scoring - 1) * C.REL_DEF; // assists less defense-sensitive
    return {
      mult: {
        min: 1,
        pts: scoring * alt * pace * rest,
        fg3m: scoring * alt * pace * rest,
        ast: assistScoring * pace * rest,
        reb: pace * rest,
        tov: pace * rest,
        stl: rest,
        blk: rest
      },
      factors: factors
    };
  }

  // Apply a team context's multipliers to a baseline line.
  function applyContext(base, ctx) {
    var m = ctx.mult;
    return {
      min: base.min * m.min, pts: base.pts * m.pts, reb: base.reb * m.reb,
      ast: base.ast * m.ast, stl: base.stl * m.stl, blk: base.blk * m.blk,
      tov: base.tov * m.tov, fg3m: base.fg3m * m.fg3m, gp: base.gp
    };
  }

  // Redistribute OUT players' minutes + a share of their production to the
  // available rotation (weighted by projected minutes). Mutates `lines`.
  // Marks players who gained meaningful minutes with `boosted = true`.
  function redistributeInjuries(lines, outLines) {
    if (!outLines.length || !lines.length) return;
    var freed = { min: 0, pts: 0, reb: 0, ast: 0, fg3m: 0, stl: 0, blk: 0, tov: 0 };
    outLines.forEach(function (o) {
      freed.min += o.proj.min;
      freed.pts += o.proj.pts * C.INJURY_TRANSFER;
      freed.reb += o.proj.reb * C.INJURY_TRANSFER;
      freed.ast += o.proj.ast * C.INJURY_TRANSFER;
      freed.fg3m += o.proj.fg3m * C.INJURY_TRANSFER;
      freed.stl += o.proj.stl * C.INJURY_TRANSFER;
      freed.blk += o.proj.blk * C.INJURY_TRANSFER;
      freed.tov += o.proj.tov * C.INJURY_TRANSFER;
    });
    var totMin = lines.reduce(function (s, l) { return s + l.proj.min; }, 0);
    if (totMin <= 0) return;
    lines.forEach(function (l) {
      var share = l.proj.min / totMin;
      var gained = freed.min * share;
      l.proj.min = Math.min(C.MIN_CAP, l.proj.min + gained);
      l.proj.pts += freed.pts * share;
      l.proj.reb += freed.reb * share;
      l.proj.ast += freed.ast * share;
      l.proj.fg3m += freed.fg3m * share;
      l.proj.stl += freed.stl * share;
      l.proj.blk += freed.blk * share;
      l.proj.tov += freed.tov * share;
      if (gained >= 1.5) l.boosted = true;
    });
  }

  // Classify an injury status string into out / questionable / probable.
  function injurySeverity(status) {
    var s = (status || "").toLowerCase();
    if (/out|inactive|season|surgery|suspend/.test(s)) return "out";
    if (/doubtful/.test(s)) return "out";
    if (/question|day.?to.?day|game.?time/.test(s)) return "questionable";
    return "probable";
  }

  return {
    VENUE_ALT: VENUE_ALT,
    constants: C,
    lineFromAvg: lineFromAvg,
    summarizeGames: summarizeGames,
    leagueAverages: leagueAverages,
    teamContext: teamContext,
    applyContext: applyContext,
    redistributeInjuries: redistributeInjuries,
    injurySeverity: injurySeverity
  };
})();
