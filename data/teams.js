// All 30 NBA franchises. Registered on the global NBA namespace so the core UI
// works even when opened directly from file://.
// Fields: id (NBA team id), abbr, city, name, fullName, conference, division,
// founded (first season as this franchise lineage), arena, colors, formerNames,
// championships (years won), runnerUps (years lost in Finals).
window.NBA = window.NBA || {};

window.NBA.teams = [
  {
    id: 1610612737, abbr: "ATL", city: "Atlanta", name: "Hawks", fullName: "Atlanta Hawks",
    conference: "East", division: "Southeast", founded: 1946, arena: "State Farm Arena",
    colors: { primary: "#E03A3E", secondary: "#C1D32F" },
    formerNames: ["Tri-Cities Blackhawks (1946-1951)", "Milwaukee Hawks (1951-1955)", "St. Louis Hawks (1955-1968)"],
    championships: [1958], runnerUps: [1957, 1960, 1961]
  },
  {
    id: 1610612738, abbr: "BOS", city: "Boston", name: "Celtics", fullName: "Boston Celtics",
    conference: "East", division: "Atlantic", founded: 1946, arena: "TD Garden",
    colors: { primary: "#007A33", secondary: "#BA9653" },
    formerNames: [],
    championships: [1957, 1959, 1960, 1961, 1962, 1963, 1964, 1965, 1966, 1968, 1969, 1974, 1976, 1981, 1984, 1986, 2008, 2024],
    runnerUps: [1958, 1985, 1987, 2010, 2022]
  },
  {
    id: 1610612751, abbr: "BKN", city: "Brooklyn", name: "Nets", fullName: "Brooklyn Nets",
    conference: "East", division: "Atlantic", founded: 1967, arena: "Barclays Center",
    colors: { primary: "#000000", secondary: "#FFFFFF" },
    formerNames: ["New Jersey Americans (1967-1968)", "New York Nets (1968-1977)", "New Jersey Nets (1977-2012)"],
    championships: [], runnerUps: [2002, 2003]
  },
  {
    id: 1610612766, abbr: "CHA", city: "Charlotte", name: "Hornets", fullName: "Charlotte Hornets",
    conference: "East", division: "Southeast", founded: 1988, arena: "Spectrum Center",
    colors: { primary: "#1D1160", secondary: "#00788C" },
    formerNames: ["Charlotte Bobcats (2004-2014)"],
    championships: [], runnerUps: []
  },
  {
    id: 1610612741, abbr: "CHI", city: "Chicago", name: "Bulls", fullName: "Chicago Bulls",
    conference: "East", division: "Central", founded: 1966, arena: "United Center",
    colors: { primary: "#CE1141", secondary: "#000000" },
    formerNames: [],
    championships: [1991, 1992, 1993, 1996, 1997, 1998], runnerUps: []
  },
  {
    id: 1610612739, abbr: "CLE", city: "Cleveland", name: "Cavaliers", fullName: "Cleveland Cavaliers",
    conference: "East", division: "Central", founded: 1970, arena: "Rocket Mortgage FieldHouse",
    colors: { primary: "#860038", secondary: "#FDBB30" },
    formerNames: [],
    championships: [2016], runnerUps: [2007, 2015, 2017, 2018]
  },
  {
    id: 1610612742, abbr: "DAL", city: "Dallas", name: "Mavericks", fullName: "Dallas Mavericks",
    conference: "West", division: "Southwest", founded: 1980, arena: "American Airlines Center",
    colors: { primary: "#00538C", secondary: "#002B5E" },
    formerNames: [],
    championships: [2011], runnerUps: [2006, 2024]
  },
  {
    id: 1610612743, abbr: "DEN", city: "Denver", name: "Nuggets", fullName: "Denver Nuggets",
    conference: "West", division: "Northwest", founded: 1967, arena: "Ball Arena",
    colors: { primary: "#0E2240", secondary: "#FEC524" },
    formerNames: ["Denver Rockets (1967-1974)"],
    championships: [2023], runnerUps: []
  },
  {
    id: 1610612765, abbr: "DET", city: "Detroit", name: "Pistons", fullName: "Detroit Pistons",
    conference: "East", division: "Central", founded: 1941, arena: "Little Caesars Arena",
    colors: { primary: "#C8102E", secondary: "#1D42BA" },
    formerNames: ["Fort Wayne Pistons (1941-1957)"],
    championships: [1989, 1990, 2004], runnerUps: [1955, 1956, 1988, 2005]
  },
  {
    id: 1610612744, abbr: "GSW", city: "Golden State", name: "Warriors", fullName: "Golden State Warriors",
    conference: "West", division: "Pacific", founded: 1946, arena: "Chase Center",
    colors: { primary: "#1D428A", secondary: "#FFC72C" },
    formerNames: ["Philadelphia Warriors (1946-1962)", "San Francisco Warriors (1962-1971)"],
    championships: [1947, 1956, 1975, 2015, 2017, 2018, 2022], runnerUps: [1948, 1964, 1967, 2016, 2019]
  },
  {
    id: 1610612745, abbr: "HOU", city: "Houston", name: "Rockets", fullName: "Houston Rockets",
    conference: "West", division: "Southwest", founded: 1967, arena: "Toyota Center",
    colors: { primary: "#CE1141", secondary: "#000000" },
    formerNames: ["San Diego Rockets (1967-1971)"],
    championships: [1994, 1995], runnerUps: [1981, 1986]
  },
  {
    id: 1610612754, abbr: "IND", city: "Indiana", name: "Pacers", fullName: "Indiana Pacers",
    conference: "East", division: "Central", founded: 1967, arena: "Gainbridge Fieldhouse",
    colors: { primary: "#002D62", secondary: "#FDBB30" },
    formerNames: [],
    championships: [], runnerUps: [2000, 2025]
  },
  {
    id: 1610612746, abbr: "LAC", city: "Los Angeles", name: "Clippers", fullName: "LA Clippers",
    conference: "West", division: "Pacific", founded: 1970, arena: "Intuit Dome",
    colors: { primary: "#C8102E", secondary: "#1D428A" },
    formerNames: ["Buffalo Braves (1970-1978)", "San Diego Clippers (1978-1984)"],
    championships: [], runnerUps: []
  },
  {
    id: 1610612747, abbr: "LAL", city: "Los Angeles", name: "Lakers", fullName: "Los Angeles Lakers",
    conference: "West", division: "Pacific", founded: 1947, arena: "Crypto.com Arena",
    colors: { primary: "#552583", secondary: "#FDB927" },
    formerNames: ["Minneapolis Lakers (1947-1960)"],
    championships: [1949, 1950, 1952, 1953, 1954, 1972, 1980, 1982, 1985, 1987, 1988, 2000, 2001, 2002, 2009, 2010, 2020],
    runnerUps: [1959, 1962, 1963, 1965, 1966, 1968, 1969, 1970, 1973, 1983, 1984, 1989, 1991, 2004, 2008]
  },
  {
    id: 1610612763, abbr: "MEM", city: "Memphis", name: "Grizzlies", fullName: "Memphis Grizzlies",
    conference: "West", division: "Southwest", founded: 1995, arena: "FedExForum",
    colors: { primary: "#5D76A9", secondary: "#12173F" },
    formerNames: ["Vancouver Grizzlies (1995-2001)"],
    championships: [], runnerUps: []
  },
  {
    id: 1610612748, abbr: "MIA", city: "Miami", name: "Heat", fullName: "Miami Heat",
    conference: "East", division: "Southeast", founded: 1988, arena: "Kaseya Center",
    colors: { primary: "#98002E", secondary: "#F9A01B" },
    formerNames: [],
    championships: [2006, 2012, 2013], runnerUps: [2011, 2014, 2020, 2023]
  },
  {
    id: 1610612749, abbr: "MIL", city: "Milwaukee", name: "Bucks", fullName: "Milwaukee Bucks",
    conference: "East", division: "Central", founded: 1968, arena: "Fiserv Forum",
    colors: { primary: "#00471B", secondary: "#EEE1C6" },
    formerNames: [],
    championships: [1971, 2021], runnerUps: [1974]
  },
  {
    id: 1610612750, abbr: "MIN", city: "Minnesota", name: "Timberwolves", fullName: "Minnesota Timberwolves",
    conference: "West", division: "Northwest", founded: 1989, arena: "Target Center",
    colors: { primary: "#0C2340", secondary: "#236192" },
    formerNames: [],
    championships: [], runnerUps: []
  },
  {
    id: 1610612740, abbr: "NOP", city: "New Orleans", name: "Pelicans", fullName: "New Orleans Pelicans",
    conference: "West", division: "Southwest", founded: 2002, arena: "Smoothie King Center",
    colors: { primary: "#0C2340", secondary: "#C8102E" },
    formerNames: ["New Orleans Hornets (2002-2013)"],
    championships: [], runnerUps: []
  },
  {
    id: 1610612752, abbr: "NYK", city: "New York", name: "Knicks", fullName: "New York Knicks",
    conference: "East", division: "Atlantic", founded: 1946, arena: "Madison Square Garden",
    colors: { primary: "#006BB6", secondary: "#F58426" },
    formerNames: [],
    championships: [1970, 1973], runnerUps: [1951, 1952, 1953, 1972, 1994, 1999]
  },
  {
    id: 1610612760, abbr: "OKC", city: "Oklahoma City", name: "Thunder", fullName: "Oklahoma City Thunder",
    conference: "West", division: "Northwest", founded: 1967, arena: "Paycom Center",
    colors: { primary: "#007AC1", secondary: "#EF3B24" },
    formerNames: ["Seattle SuperSonics (1967-2008)"],
    championships: [1979, 2025], runnerUps: [1978, 1996, 2012]
  },
  {
    id: 1610612753, abbr: "ORL", city: "Orlando", name: "Magic", fullName: "Orlando Magic",
    conference: "East", division: "Southeast", founded: 1989, arena: "Kia Center",
    colors: { primary: "#0077C0", secondary: "#C4CED4" },
    formerNames: [],
    championships: [], runnerUps: [1995, 2009]
  },
  {
    id: 1610612755, abbr: "PHI", city: "Philadelphia", name: "76ers", fullName: "Philadelphia 76ers",
    conference: "East", division: "Atlantic", founded: 1949, arena: "Wells Fargo Center",
    colors: { primary: "#006BB6", secondary: "#ED174C" },
    formerNames: ["Syracuse Nationals (1949-1963)"],
    championships: [1955, 1967, 1983], runnerUps: [1950, 1954, 1977, 1980, 1982, 2001]
  },
  {
    id: 1610612756, abbr: "PHX", city: "Phoenix", name: "Suns", fullName: "Phoenix Suns",
    conference: "West", division: "Pacific", founded: 1968, arena: "Footprint Center",
    colors: { primary: "#1D1160", secondary: "#E56020" },
    formerNames: [],
    championships: [], runnerUps: [1976, 1993, 2021]
  },
  {
    id: 1610612757, abbr: "POR", city: "Portland", name: "Trail Blazers", fullName: "Portland Trail Blazers",
    conference: "West", division: "Northwest", founded: 1970, arena: "Moda Center",
    colors: { primary: "#E03A3E", secondary: "#000000" },
    formerNames: [],
    championships: [1977], runnerUps: [1990, 1992]
  },
  {
    id: 1610612758, abbr: "SAC", city: "Sacramento", name: "Kings", fullName: "Sacramento Kings",
    conference: "West", division: "Pacific", founded: 1945, arena: "Golden 1 Center",
    colors: { primary: "#5A2D81", secondary: "#63727A" },
    formerNames: ["Rochester Royals (1945-1957)", "Cincinnati Royals (1957-1972)", "Kansas City Kings (1972-1985)"],
    championships: [1951], runnerUps: []
  },
  {
    id: 1610612759, abbr: "SAS", city: "San Antonio", name: "Spurs", fullName: "San Antonio Spurs",
    conference: "West", division: "Southwest", founded: 1967, arena: "Frost Bank Center",
    colors: { primary: "#C4CED4", secondary: "#000000" },
    formerNames: ["Dallas Chaparrals (1967-1973)"],
    championships: [1999, 2003, 2005, 2007, 2014], runnerUps: [2013]
  },
  {
    id: 1610612761, abbr: "TOR", city: "Toronto", name: "Raptors", fullName: "Toronto Raptors",
    conference: "East", division: "Atlantic", founded: 1995, arena: "Scotiabank Arena",
    colors: { primary: "#CE1141", secondary: "#000000" },
    formerNames: [],
    championships: [2019], runnerUps: []
  },
  {
    id: 1610612762, abbr: "UTA", city: "Utah", name: "Jazz", fullName: "Utah Jazz",
    conference: "West", division: "Northwest", founded: 1974, arena: "Delta Center",
    colors: { primary: "#002B5C", secondary: "#00471B" },
    formerNames: ["New Orleans Jazz (1974-1979)"],
    championships: [], runnerUps: [1997, 1998]
  },
  {
    id: 1610612764, abbr: "WAS", city: "Washington", name: "Wizards", fullName: "Washington Wizards",
    conference: "East", division: "Southeast", founded: 1961, arena: "Capital One Arena",
    colors: { primary: "#002B5C", secondary: "#E31837" },
    formerNames: ["Chicago Packers (1961-1962)", "Chicago Zephyrs (1962-1963)", "Baltimore Bullets (1963-1973)", "Capital/Washington Bullets (1973-1997)"],
    championships: [1978], runnerUps: [1971, 1975, 1979]
  }
];
