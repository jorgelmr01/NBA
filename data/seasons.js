// Per-team season records & results, keyed by team id.
// Each entry: { year, wins, losses, result, coach, notes }
// result: "Champion" | "Runner-up" | "Conference Finals" | "Playoffs" | "Missed Playoffs"
//
// This is a curated, growable dataset. The team timeline derives
// championships-to-date from data/teams.js (championships[]) regardless of how
// complete this file is, and the live API (js/api.js) backfills recent records.
window.NBA = window.NBA || {};

window.NBA.seasons = {
  // Boston Celtics (sample of notable seasons; extend over time)
  1610612738: [
    { year: 2024, wins: 64, losses: 18, result: "Champion", coach: "Joe Mazzulla", notes: "18th title, beat Dallas 4-1." },
    { year: 2022, wins: 51, losses: 31, result: "Runner-up", coach: "Ime Udoka", notes: "Lost Finals to Golden State." },
    { year: 2008, wins: 66, losses: 16, result: "Champion", coach: "Doc Rivers", notes: "Big Three era begins; beat the Lakers." }
  ],
  // Los Angeles Lakers (sample)
  1610612747: [
    { year: 2020, wins: 52, losses: 19, result: "Champion", coach: "Frank Vogel", notes: "Bubble title; LeBron Finals MVP." },
    { year: 2010, wins: 57, losses: 25, result: "Champion", coach: "Phil Jackson", notes: "Back-to-back; beat Boston in 7." },
    { year: 2009, wins: 65, losses: 17, result: "Champion", coach: "Phil Jackson", notes: "Kobe Finals MVP vs Orlando." }
  ],
  // Golden State Warriors (sample)
  1610612744: [
    { year: 2022, wins: 53, losses: 29, result: "Champion", coach: "Steve Kerr", notes: "Curry Finals MVP vs Boston." },
    { year: 2016, wins: 73, losses: 9, result: "Runner-up", coach: "Steve Kerr", notes: "Record regular season; lost Finals to Cleveland." },
    { year: 2015, wins: 67, losses: 15, result: "Champion", coach: "Steve Kerr", notes: "First title since 1975." }
  ]
};
