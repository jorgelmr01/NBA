#!/usr/bin/env python3
"""
Generate the full player dataset for NBA Team Explorer from the public
stats.nba.com JSON endpoints.

Outputs:
  data/players/{PERSON_ID}.json   -> per-season stats (regular + playoffs)
  data/player-index.js            -> compact index of ALL players (replaces seed)

Notes:
  * stats.nba.com is unofficial-but-public, rate-limited, and requires browser-
    like headers. This script throttles requests and RESUMES (skips files that
    already exist), so you can run it repeatedly.
  * Photos: the app builds headshot URLs from PERSON_ID, so no images are
    downloaded here.

Usage:
  python tools/generate-players.py                 # all players (slow!)
  python tools/generate-players.py --active-only    # only current players
  python tools/generate-players.py --limit 50       # first 50 (quick test)
  python tools/generate-players.py --delay 0.8      # seconds between requests

For personal/educational use. Respect stats.nba.com terms.
"""

import argparse
import json
import os
import ssl
import sys
import time
import urllib.request
import urllib.error
import urllib.parse

BASE = "https://stats.nba.com/stats"
HEADERS = {
    "Host": "stats.nba.com",
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nba.com/",
    "Origin": "https://www.nba.com",
    "x-nba-stats-origin": "stats",
    "x-nba-stats-token": "true",
    "Connection": "keep-alive",
}

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
PLAYERS_DIR = os.path.join(DATA_DIR, "players")

# SSL context used for all requests. Configured in main().
SSL_CONTEXT = None


def build_ssl_context(insecure):
    """Build an SSL context.

    Default: verify using the OS trust store when possible (handles corporate
    proxies whose root CA is installed on the machine). If `truststore` is
    available we use it; otherwise the system default.

    --insecure: disable certificate verification entirely (use only on a
    trusted corporate network where TLS is intercepted by a proxy with a
    non-standard CA that OpenSSL rejects).
    """
    if insecure:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx
    try:
        import truststore  # type: ignore
        return truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    except Exception:
        return ssl.create_default_context()

# Map stats.nba.com TEAM_ID to our abbreviations is not needed: we store teamId
# directly and the app resolves it. Season is stored as the END year (e.g.
# "2023-24" -> 2024).


def fetch(endpoint, params, retries=3, delay=0.8):
    qs = "&".join("%s=%s" % (k, urllib.parse.quote(str(v))) for k, v in params.items())
    url = "%s/%s?%s" % (BASE, endpoint, qs)
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30, context=SSL_CONTEXT) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            wait = delay * (attempt + 1) * 2
            sys.stderr.write("  retry %d after error: %s (waiting %.1fs)\n" % (attempt + 1, e, wait))
            time.sleep(wait)
    return None


def result_to_dicts(result_set):
    headers = result_set["headers"]
    return [dict(zip(headers, row)) for row in result_set["rowSet"]]


def get_all_players(season="2024-25", active_only=False):
    params = {
        "LeagueID": "00",
        "Season": season,
        "IsOnlyCurrentSeason": "1" if active_only else "0",
    }
    data = fetch("commonallplayers", params)
    if not data:
        return []
    return result_to_dicts(data["resultSets"][0])


def season_str_to_end_year(season_str):
    # "2023-24" -> 2024 ; "1999-00" -> 2000
    try:
        start = int(season_str.split("-")[0])
        return start + 1
    except Exception:
        return None


def map_career_row(row, kind):
    return {
        "season": season_str_to_end_year(row.get("SEASON_ID", "")),
        "teamId": row.get("TEAM_ID"),
        "teamAbbr": row.get("TEAM_ABBREVIATION"),
        "gp": row.get("GP"),
        "min": row.get("MIN"),
        "pts": row.get("PTS"),
        "reb": row.get("REB"),
        "ast": row.get("AST"),
        "stl": row.get("STL"),
        "blk": row.get("BLK"),
        "fg_pct": row.get("FG_PCT"),
        "fg3_pct": row.get("FG3_PCT"),
        "ft_pct": row.get("FT_PCT"),
        "type": kind,
    }


def per_game(row):
    # playercareerstats returns TOTALS by default; convert to per-game for the app.
    gp = row.get("gp") or 0
    if not gp:
        return row
    for k in ("min", "pts", "reb", "ast", "stl", "blk"):
        if isinstance(row.get(k), (int, float)):
            row[k] = round(row[k] / gp, 1)
    return row


def get_player_career(person_id, delay):
    data = fetch("playercareerstats", {"PlayerID": person_id, "PerMode": "PerGame"}, delay=delay)
    if not data:
        return None
    sets = {rs["name"]: rs for rs in data["resultSets"]}
    seasons = []
    if "SeasonTotalsRegularSeason" in sets:
        for r in result_to_dicts(sets["SeasonTotalsRegularSeason"]):
            seasons.append(map_career_row(r, "regular"))
    if "SeasonTotalsPostSeason" in sets:
        for r in result_to_dicts(sets["SeasonTotalsPostSeason"]):
            seasons.append(map_career_row(r, "playoffs"))
    return seasons


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", default="2025-26", help="Season used to list players")
    ap.add_argument("--active-only", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--delay", type=float, default=0.8, help="Seconds between requests")
    ap.add_argument("--insecure", action="store_true",
                    help="Disable TLS verification (for corporate proxies that intercept HTTPS)")
    args = ap.parse_args()

    # Make stdout/stderr tolerant of non-Latin player names on Windows consoles.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    global SSL_CONTEXT
    SSL_CONTEXT = build_ssl_context(args.insecure)
    if args.insecure:
        sys.stderr.write("WARNING: TLS verification disabled (--insecure).\n")

    os.makedirs(PLAYERS_DIR, exist_ok=True)

    print("Fetching player list ...")
    players = get_all_players(season=args.season, active_only=args.active_only)
    if not players:
        sys.exit("Failed to fetch player list from stats.nba.com")
    if args.limit:
        players = players[: args.limit]
    print("Found %d players." % len(players))

    # Build the index from the player list and write it FIRST, so even a long or
    # interrupted stats run leaves the app with a complete, browsable index.
    index = []
    for p in players:
        roster_status = p.get("ROSTERSTATUS")
        team_abbr = p.get("TEAM_ABBREVIATION") or ""
        index.append({
            "id": p.get("PERSON_ID"),
            "name": p.get("DISPLAY_FIRST_LAST") or p.get("DISPLAY_LAST_COMMA_FIRST"),
            "positions": "",
            "from": int(p.get("FROM_YEAR")) if p.get("FROM_YEAR") else None,
            "to": int(p.get("TO_YEAR")) if p.get("TO_YEAR") else None,
            "teams": [team_abbr] if team_abbr else [],
            "status": "active" if roster_status in (1, "1", "Active") else "retired",
            "isHOF": False,
            "isLegend": False,
        })

    write_index(index)
    print("Wrote player-index.js with %d players. Fetching per-season stats..." % len(index))

    # Fetch per-season stats for each player (resumes by skipping cached files).
    for i, p in enumerate(players, 1):
        pid = p.get("PERSON_ID")
        name = p.get("DISPLAY_FIRST_LAST") or p.get("DISPLAY_LAST_COMMA_FIRST")
        out_path = os.path.join(PLAYERS_DIR, "%s.json" % pid)
        if os.path.exists(out_path):
            print("[%d/%d] %s (cached)" % (i, len(players), name))
            continue

        print("[%d/%d] %s ..." % (i, len(players), name))
        seasons = get_player_career(pid, args.delay)
        if seasons is not None:
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump({"id": pid, "name": name, "seasons": seasons}, f, ensure_ascii=False)
        time.sleep(args.delay)

    print("\nDone. %d players indexed; per-season stats in data/players/." % len(players))


def write_index(index):
    index = sorted(index, key=lambda x: (x["name"] or ""))
    index_path = os.path.join(DATA_DIR, "player-index.js")
    with open(index_path, "w", encoding="utf-8") as f:
        f.write("// AUTO-GENERATED by tools/generate-players.py. Do not edit by hand.\n")
        f.write("window.NBA = window.NBA || {};\n")
        f.write("window.NBA.players = ")
        json.dump(index, f, ensure_ascii=False)
        f.write(";\n")


if __name__ == "__main__":
    main()
