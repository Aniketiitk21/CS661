# individual.py

from flask import request, jsonify
import pandas as pd

# dismissal kinds that count as wickets (excluding run out)
WICKET_KINDS = {
    "bowled", "caught", "lbw", "stumped",
    "caught and bowled", "hit wicket"
}


def resolve_player_name(raw: str, all_names: list, deliveries: pd.DataFrame) -> str | None:
    """
    Resolve a raw input string to one of the canonical player names.
    Exact match first; then surname + initial; then pick by who has more matches.
    """
    q = raw.strip()
    if not q:
        return None

    # filter out bad names
    all_names = [n for n in all_names if isinstance(n, str) and n.strip()]

    # 1) exact match
    for name in all_names:
        if name.lower() == q.lower():
            return name

    # 2) surname + initial
    parts = q.lower().split()
    surname, initial = parts[-1], parts[0][0]
    candidates = [
        name for name in all_names
        if name.lower().split()[-1] == surname
        and name.split()[0][0].lower() == initial
    ]
    if not candidates:
        return None

    # pick the one who appears in most matches
    def match_count(p):
        dfp = deliveries[
            (deliveries["batter"] == p) |
            (deliveries["bowler"]  == p)
        ]
        return dfp["match_id"].nunique()

    return max(candidates, key=match_count)


def register_individual_routes(app, matches: pd.DataFrame, deliveries: pd.DataFrame):
    """
    Registers:
      - GET /api/individual?player=...&years=...
      - GET /api/batter_vs_bowler?playerA=...&playerB=...&years=...
      - GET /api/player_vs_player?playerA=...&playerB=...&years=...
    """

    # map match_id → season
    match_season = dict(zip(matches["id"], matches["date"].dt.year))

    # all known names
    ALL_NAMES = sorted(
        set(deliveries["batter"].dropna()) |
        set(deliveries["bowler"].dropna())
    )

    def compute_individual_stats(player: str, df: pd.DataFrame):
        """Given a canonical player and filtered deliveries df, compute all stats."""
        # batting subset
        bat = df[df["batter"] == player]
        total_runs  = int(bat["batsman_runs"].sum())
        balls_faced = len(bat)
        dismissals  = int(
            bat["player_dismissed"]
               .fillna("")
               .str.lower()
               .eq(player.lower())
               .sum()
        )
        average     = round(total_runs / dismissals, 2) if dismissals else None
        strike_rate = round(total_runs / balls_faced * 100, 2) if balls_faced else None
        fours       = int((bat["batsman_runs"] == 4).sum())
        sixes       = int((bat["batsman_runs"] == 6).sum())

        # bowling subset
        bowl = df[df["bowler"] == player]
        wickets       = int(bowl["dismissal_kind"].isin(WICKET_KINDS).sum())
        runs_conceded = int(bowl["total_runs"].sum())
        extras        = bowl["extras_type"].fillna("")
        legal         = bowl[~extras.isin(["noballs", "wides"])]
        balls_bowled  = len(legal)
        overs         = round(balls_bowled / 6, 1) if balls_bowled else 0
        economy       = round(runs_conceded / overs, 2) if overs else None

        # matches played (bat or bowl)
        bat_matches  = bat["match_id"].nunique()
        bowl_matches = bowl["match_id"].nunique()
        matches_played = int(max(bat_matches, bowl_matches))

        # wicket-hauls
        wk_per_match = (
            bowl.groupby("match_id")["dismissal_kind"]
                .apply(lambda s: s.isin(WICKET_KINDS).sum())
        )
        three_hauls = int((wk_per_match >= 3).sum())
        five_hauls  = int((wk_per_match >= 5).sum())

        # fielding
        fld = df[df["fielder"] == player]
        fielding_attempts = int(
            fld["dismissal_kind"]
               .isin(["caught", "run out"])
               .sum()
        )

        # season-by-season batting
        batting_season = []
        for season, grp in bat.groupby("season"):
            runs  = int(grp["batsman_runs"].sum())
            balls = len(grp)
            sr    = round(runs / balls * 100, 2) if balls else None
            batting_season.append({
                "season": int(season),
                "runs":     runs,
                "strike_rate": sr
            })
        batting_season.sort(key=lambda x: x["season"])

        # batting dismissal modes
        bd = (
            bat["dismissal_kind"]
               .dropna()
               .value_counts()
               .rename_axis("mode")
               .reset_index(name="count")
        )
        batting_dismissals = bd.to_dict("records")

        # season-by-season bowling
        bowling_season = []
        for season, grp in bowl.groupby("season"):
            wks    = int(grp["dismissal_kind"].isin(WICKET_KINDS).sum())
            runs_c = int(grp["total_runs"].sum())
            ex2    = grp["extras_type"].fillna("")
            legal2 = grp[~ex2.isin(["noballs", "wides"])]
            balls2 = len(legal2)
            ov2    = round(balls2 / 6, 1) if balls2 else 0
            eco    = round(runs_c / ov2, 2) if ov2 else None
            bowling_season.append({
                "season": int(season),
                "wickets":    wks,
                "economy":    eco
            })
        bowling_season.sort(key=lambda x: x["season"])

        # bowling dismissal modes
        bd2 = (
            bowl["dismissal_kind"]
                .dropna()
                .value_counts()
                .rename_axis("mode")
                .reset_index(name="count")
        )
        bowling_dismissals = bd2.to_dict("records")

        return {
            "player": player,
            "batting": {
                "total_runs":  total_runs,
                "fours":       fours,
                "sixes":       sixes,
                "average":     average,
                "strike_rate": strike_rate
            },
            "bowling": {
                "matches_played":     matches_played,
                "wickets":            wickets,
                "three_wicket_hauls": three_hauls,
                "five_wicket_hauls":  five_hauls,
                "runs_conceded":      runs_conceded,
                "overs":              overs,
                "economy":            economy
            },
            "fielding": {
                "fielding_attempts": fielding_attempts
            },
            "batting_season":     batting_season,
            "batting_dismissals": batting_dismissals,
            "bowling_season":     bowling_season,
            "bowling_dismissals": bowling_dismissals
        }

    @app.route("/api/individual")
    def individual():
        raw       = request.args.get("player", "").strip()
        years_raw = request.args.get("years", "all").strip()
        if not raw:
            return jsonify({"error": "No player name provided"}), 400

        player = resolve_player_name(raw, ALL_NAMES, deliveries)
        if not player:
            return jsonify({"error": f"No players matched “{raw}”"}), 404

        # filter deliveries by seasons
        df = deliveries.copy()
        df["season"] = df["match_id"].map(match_season)
        if years_raw != "all":
            try:
                yrs = [int(y) for y in years_raw.split(",")]
                df = df[df["season"].isin(yrs)]
            except ValueError:
                pass

        stats = compute_individual_stats(player, df)
        return jsonify(stats)

    @app.route("/api/batter_vs_bowler")
    def batter_vs_bowler():
        batter_raw  = request.args.get("playerA", "").strip()
        bowler_raw  = request.args.get("playerB", "").strip()
        years_param = request.args.get("years", "all").strip()

        batter = resolve_player_name(batter_raw, ALL_NAMES, deliveries)
        bowler = resolve_player_name(bowler_raw, ALL_NAMES, deliveries)
        if not batter or not bowler:
            return jsonify({"error": "Could not resolve one or both names"}), 400

        # filter by seasons
        df2 = deliveries.copy()
        df2["season"] = df2["match_id"].map(match_season)
        if years_param != "all":
            try:
                yrs = [int(y) for y in years_param.split(",")]
                df2 = df2[df2["season"].isin(yrs)]
            except ValueError:
                pass

        h2h = df2[(df2["batter"] == batter) & (df2["bowler"] == bowler)]
        matches_h2h = int(h2h["match_id"].nunique())
        balls_faced = len(h2h)
        runs_scored = int(h2h["batsman_runs"].sum())
        strike_rate = round(runs_scored / balls_faced * 100, 2) if balls_faced else None
        times_out   = int(
            h2h["player_dismissed"]
               .fillna("")
               .str.lower()
               .eq(batter.lower())
               .sum()
        )

        return jsonify({
            "batter":         batter,
            "bowler":         bowler,
            "matches_played": matches_h2h,
            "balls_faced":    balls_faced,
            "runs_scored":    runs_scored,
            "strike_rate":    strike_rate,
            "times_out":      times_out
        })

    @app.route("/api/player_vs_player")
    def player_vs_player():
        rawA        = request.args.get("playerA", "").strip()
        rawB        = request.args.get("playerB", "").strip()
        years_param = request.args.get("years", "all").strip()

        A = resolve_player_name(rawA, ALL_NAMES, deliveries)
        B = resolve_player_name(rawB, ALL_NAMES, deliveries)
        if not A or not B:
            return jsonify({"error": "Could not resolve one or both names"}), 400

        # filter deliveries by seasons
        df = deliveries.copy()
        df["season"] = df["match_id"].map(match_season)
        if years_param != "all":
            try:
                yrs = [int(y) for y in years_param.split(",")]
                df = df[df["season"].isin(yrs)]
            except ValueError:
                pass

        statsA = compute_individual_stats(A, df)
        statsB = compute_individual_stats(B, df)

        return jsonify({
            "playerA": statsA,
            "playerB": statsB
        })
