# NBA Team Explorer

A friendly, **zero-dependency** web app to explore all 30 NBA franchises and every player in league history — year by year. See rosters, season stats, championships accumulated to date, draft picks, and legends. Built for newcomers who want to quickly get to know the NBA and pick a favorite team.

No framework, no build step. Just HTML, CSS, and vanilla JavaScript.

## Features

- **All 30 teams**: identity, colors, arena, founding, former names, and full championship history.
- **Year-by-year time machine**: a per-team timeline slider. Scrub through any season to see the record, result, the era's notable players (with rookie/legend/HOF tags), and **championships-to-date**.
- **Every player, any year**: a searchable player index and profiles with a **photo**, draft info, accolades, and a **full per-season stats table** (regular season + playoffs).
- **Player photos**: official NBA headshots by `PERSON_ID`, with a graceful initials-avatar fallback plus links to the official NBA.com / Basketball-Reference page for every player.
- **Compare**: side-by-side franchise comparison at any year.
- **Favorite team**: saved locally, surfaced in the header.
- **Live enrichment (optional)**: current-season data via the free [balldontlie](https://www.balldontlie.io) API.

## Run it

Because the full player dataset is loaded on demand via `fetch`, serve the folder with any static server:

```bash
# Python (built-in)
python -m http.server 5173
```

Then open http://localhost:5173.

> Core team browsing also works by opening `index.html` directly, but player stat files and the live API require a local server (above).

## Data

The app ships with a bundled dataset so it works out of the box:

- `data/teams.js` — all 30 franchises + championships (hand-curated facts).
- `data/seasons.js` — curated notable seasons (growable).
- `data/player-index.js` — a **seed** of legends and current stars (replaced by the generator with all players).
- `data/curated.js` — hand-curated overlay (legend/HOF flags, accolades, draft, career) merged on top at startup.
- `data/meta.js` — conferences, divisions, onboarding primer.

### Generate the full player history

`data/player-index.js` is a seed. To populate **every player in NBA history** (~5,100 players) with full per-season stats, run the generator (Python 3, standard library only):

```bash
python tools/generate-players.py --active-only       # ~580 current players
python tools/generate-players.py --limit 50          # quick test
python tools/generate-players.py                     # everyone (~5,100, slow)
```

This pulls from the public `stats.nba.com` endpoints and writes:

- `data/player-index.js` — the full index of all players (**written first**, so the app is immediately browsable)
- `data/players/{PERSON_ID}.json` — per-season stats (regular + playoffs), filled in as the run proceeds

The script throttles requests and **resumes** (skips stat files it already wrote), so you can run it repeatedly. A full run can take a while; the index appears in seconds and stat files accumulate in the background. `stats.nba.com` is unofficial-but-public and rate-limited; use a polite `--delay` and run for personal/educational purposes only.

**Behind a corporate proxy?** If you get `SSL: CERTIFICATE_VERIFY_FAILED`, your network is intercepting HTTPS with a custom root CA. Add `--insecure` to skip TLS verification (only on a trusted network):

```bash
python tools/generate-players.py --active-only --insecure
```

The curated overlay (`data/curated.js`) carries hand-curated fields (legend/HOF flags, accolades, draft, career averages) for marquee players and is merged on top at startup, so regenerating the index never loses it.

### Connect live data — no terminal needed

For the richest experience, connect the free **balldontlie** API right inside the app:

1. Click **⚡ Connect** (top-right) — or the "Connect data" banner on any player/team page.
2. Follow the steps in the dialog: create a free account at [app.balldontlie.io](https://app.balldontlie.io/), copy your API key.
3. Paste it and press **Connect**. The app verifies the key and reloads with live data.

Once connected, every **player profile** gains a *Season explorer*: pick any season to see full season averages **and a game-by-game breakdown** (PTS, REB, AST, STL, BLK, TOV, shooting splits, opponent, W/L), plus a relevance/role summary. The key is stored only in your browser (`localStorage`); the free tier is rate-limited, so data loads one season at a time.

Prefer a config file? Create `js/config.js` with `window.NBA_CONFIG = { balldontlieKey: "YOUR_FREE_KEY" };` and add `<script src="js/config.js"></script>` before the other scripts in `index.html`.

### Team rosters & roles by season

Run this after `generate-players.py` to build the franchise → season → roster index used by the team page (no API, no network):

```bash
python tools/build-team-seasons.py    # reads data/players/*.json -> data/team-seasons.js
```

The team page's **time machine** then groups each season's roster into **Key players**, **Supporting cast**, and **Young & growth** (with per-player MPG/PPG/RPG/APG), so it's clear who carried the team and who was developing for the future.

## Data model

- **Team**: `id, abbr, city, name, fullName, conference, division, founded, arena, colors{primary,secondary}, formerNames[], championships[], runnerUps[]`
- **Player (index)**: `id (NBA PERSON_ID), name, positions, from, to, teams[], status, isHOF, isLegend, draft{year,round,pick,teamAbbr}, career{ppg,rpg,apg}, accolades[]`
- **Player season stats** (`data/players/{id}.json`): `{ id, name, seasons: [{ season, teamId, teamAbbr, gp, min, pts, reb, ast, stl, blk, fg_pct, fg3_pct, ft_pct, type }] }`

`season` is the end year (e.g. `2024` = the 2023-24 season).

## Project structure

```
index.html            # script load order + app shell
css/styles.css        # theme + components
js/
  app.js              # bootstrap + nav + route registration
  router.js           # hash router
  store.js            # localStorage (favorite, API key) + session cache
  util.js             # helpers (champ counts, formatting, contrast)
  image.js            # headshot URLs + initials fallback
  api.js              # local stats loader + balldontlie wrapper
  views/              # home, teams, team, players, player, compare
data/                 # bundled datasets (+ generated players/)
  teams.js, seasons.js, meta.js
  player-index.js     # full player index (generated)
  curated.js          # curated overlay merged at startup
  players/{id}.json   # generated per-season stats
tools/generate-players.py
```

## Notes

Team and player names, stats, and photos are property of the NBA and respective rights holders. This project is a non-commercial, educational tool.
