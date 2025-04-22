# individual.py

from flask import request, jsonify
import pandas as pd

def resolve_player_name(raw: str, all_names: list, deliveries: pd.DataFrame) -> str | None:
    """
    Resolves the player name from the raw input. This checks for an exact match first and then falls back to 
    matching by surname and first initial.
    """
    q = raw.strip()
    if not q:
        return None
    
    # Handle NaN or invalid data in all_names
    all_names = [name for name in all_names if isinstance(name, str) and name.strip()]

    # 1) Exact match
    for name in all_names:
        if name.lower() == q.lower():
            return name
    
    # 2) Surname + initial fallback
    parts  = q.lower().split()
    surname, initial = parts[-1], parts[0][0]
    candidates = [
        name for name in all_names
        if name.lower().split()[-1] == surname
        and name.split()[0][0].lower() == initial
    ]
    
    if not candidates:
        return None
    
    # Pick by match_count (number of matches player appeared in)
    def match_count(player):
        dfp = deliveries[
            (deliveries.batter == player) |
            (deliveries.bowler == player)
        ]
        return dfp.match_id.nunique()
    
    return max(candidates, key=match_count)


def register_individual_routes(app, matches: pd.DataFrame, deliveries: pd.DataFrame):
    # Build match_id → season map once
    match_season = dict(zip(matches["id"], matches["date"].dt.year))

    # Gather all unique player names
    ALL_NAMES = sorted(set(deliveries["batter"]).union(deliveries["bowler"]))

    @app.route("/api/individual")
    def individual():
        raw = request.args.get("player", "").strip()
        years_param = request.args.get("years", "all")

        if not raw:
            return jsonify({"error": "No player name provided"}), 400

        # Resolve to canonical name
        canonical = resolve_player_name(raw, ALL_NAMES, deliveries)
        if not canonical:
            return jsonify({"error": f"No players matched “{raw}”"}), 404

        # Filter deliveries by season
        df = deliveries.copy()
        df["season"] = df["match_id"].map(match_season)
        if years_param != "all":
            years = [int(y) for y in years_param.split(",") if y.isdigit()]
            df = df[df["season"].isin(years)]

        # —— Batting stats —— 
        bat = df[df["batter"] == canonical]
        total_runs   = int(bat["batsman_runs"].sum())
        balls_faced  = len(bat)
        dismissals   = int(
            (bat["player_dismissed"]
               .fillna("")
               .str.lower() == canonical.lower()
            ).sum()
        )
        average      = round(total_runs / dismissals, 2) if dismissals > 0 else None
        strike_rate  = round(total_runs / balls_faced * 100, 2) if balls_faced > 0 else None
        fours        = int((bat["batsman_runs"] == 4).sum())
        sixes        = int((bat["batsman_runs"] == 6).sum())

        # —— Bowling stats —— 
        bowl = df[df["bowler"] == canonical]
        B_DIS = {"bowled", "caught", "lbw", "stumped", "caught and bowled", "hit wicket"}
        wickets       = int(bowl["dismissal_kind"].isin(B_DIS).sum())
        runs_conceded = int(bowl["total_runs"].sum())
        balls_bowled  = len(bowl)
        overs         = round(balls_bowled / 6, 1)
        economy       = round(runs_conceded / overs, 2) if overs > 0 else None

        # —— Fielding stats —— 
        fld = df[df["fielder"] == canonical]
        F_DIS = {"caught", "run out"}
        fielding_attempts = int(fld["dismissal_kind"].isin(F_DIS).sum())

        return jsonify({
            "player": canonical,
            "batting": {
                "total_runs": total_runs,
                "fours":      fours,
                "sixes":      sixes,
                "average":    average,
                "strike_rate": strike_rate
            },
            "bowling": {
                "wickets":        wickets,
                "runs_conceded":  runs_conceded,
                "overs":          overs,
                "economy":        economy
            },
            "fielding": {
                "fielding_attempts": fielding_attempts
            }
        })

    @app.route("/api/batter_vs_bowler")
    def batter_vs_bowler():
        batter_raw = request.args.get("playerA", "").strip()
        bowler_raw = request.args.get("playerB", "").strip()
        years_param = request.args.get("years", "all")

        # Resolve names
        batter = resolve_player_name(batter_raw, ALL_NAMES, deliveries)
        bowler = resolve_player_name(bowler_raw, ALL_NAMES, deliveries)
        if not batter or not bowler:
            return jsonify({"error": "Could not resolve one or both names"}), 400

        # Filter by season
        df = deliveries.copy()
        df["season"] = df["match_id"].map(match_season)
        if years_param != "all":
            yrs = [int(y) for y in years_param.split(",") if y.isdigit()]
            df = df[df["season"].isin(yrs)]

        # Head‑to‑head subset
        df_h2h = df[(df["batter"] == batter) & (df["bowler"] == bowler)]

        balls_faced = len(df_h2h)
        runs_scored = int(df_h2h["batsman_runs"].sum())
        strike_rate = round(runs_scored / balls_faced * 100, 2) if balls_faced > 0 else None
        times_out   = int(
            (df_h2h["player_dismissed"].fillna("").str.lower() == batter.lower()).sum()
        )

        return jsonify({
            "batter":      batter,
            "bowler":      bowler,
            "balls_faced": balls_faced,
            "runs_scored": runs_scored,
            "strike_rate": strike_rate,
            "times_out":   times_out
        })
