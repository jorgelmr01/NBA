// Conferences, divisions, and onboarding primer content.
window.NBA = window.NBA || {};

window.NBA.meta = {
  // Latest season the app considers "current" (the year the season ends).
  currentSeason: 2025,

  conferences: ["East", "West"],

  divisions: {
    East: ["Atlantic", "Central", "Southeast"],
    West: ["Northwest", "Pacific", "Southwest"]
  },

  // Short newcomer primer shown on the home page.
  primer: [
    {
      title: "30 teams, 2 conferences",
      body: "The NBA has 30 franchises split into the Eastern and Western Conference. Each conference has three divisions of five teams."
    },
    {
      title: "The season",
      body: "An 82-game regular season runs from October to April. The best teams qualify for the playoffs."
    },
    {
      title: "The playoffs & Finals",
      body: "The top teams in each conference play best-of-seven series. The two conference champions meet in the NBA Finals to decide the title."
    },
    {
      title: "The Draft",
      body: "Each summer, teams pick new (mostly college or international) players in the NBA Draft. A first-year player is called a rookie."
    },
    {
      title: "Legends & the Hall of Fame",
      body: "All-time greats are honored in the Naismith Hall of Fame and often have their jersey numbers retired by their team."
    }
  ]
};
