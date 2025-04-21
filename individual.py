# individual.py

from flask import request, jsonify
import pandas as pd

def resolve_player_name(raw: str, all_names: list, deliveries: pd.DataFrame) -> str | None:
    q = raw.strip()
    if not q:
        return None
    # 1) exact
    for name in all_names:
        if name.lower() == q.lower():
            return name
    # 2) surname + initial fallback
    parts  = q.lower().split()
    surname, initial = parts[-1], parts[0][0]
    candidates = [
        name for name in all_names
        if name.lower().split()[-1] == surname
        and name.split()[0][0].lower()    == initial
    ]
    if not candidates:
        return None
    # pick by match_count
    def match_count(player):
        dfp = deliveries[
            (deliveries.batter == player) |
            (deliveries.bowler  == player)
        ]
        return dfp.match_id.nunique()
    return max(candidates, key=match_count)


def compute_player_stats(player: str, df: pd.DataFrame) -> dict:
    # Batting
    bat = df[df.batter == player]
    total_runs  = int(bat.batsman_runs.sum())
    balls       = len(bat)
    dismissals  = int((bat.player_dismissed.fillna("")
                              .str.lower() == player.lower()).sum())
    average     = round(total_runs / dismissals, 2) if dismissals>0 else None
    strike_rate = round(total_runs/balls*100, 2)   if balls>0     else None
    fours       = int((bat.batsman_runs==4).sum())
    sixes       = int((bat.batsman_runs==6).sum())

    # Bowling
    bowl = df[df.bowler == player]
    B_DIS = {"bowled","caught","lbw","stumped","caught and bowled","hit wicket"}
    wickets       = int(bowl.dismissal_kind.isin(B_DIS).sum())
    runs_conceded = int(bowl.total_runs.sum())
    balls_bowled  = len(bowl)
    overs         = round(balls_bowled/6, 1)
    economy       = round(runs_conceded/overs, 2) if overs>0 else None

    # Fielding
    fld = df[df.fielder == player]
    F_DIS = {"caught","run out"}
    fielding_attempts = int(fld.dismissal_kind.isin(F_DIS).sum())

    return {
      "player": player,
      "batting": {
        "total_runs": total_runs,
        "fours":      fours,
        "sixes":      sixes,
        "average":    average,
        "strike_rate": strike_rate
      },
      "bowling": {
        "wickets":       wickets,
        "runs_conceded": runs_conceded,
        "overs":         overs,
        "economy":       economy
      },
      "fielding": {
        "fielding_attempts": fielding_attempts
      }
    }


def register_individual_routes(app, matches: pd.DataFrame, deliveries: pd.DataFrame):
    # Precompute season map and name list
    match_season = dict(zip(matches.id, matches.date.dt.year))
    ALL_NAMES    = sorted(set(deliveries.batter).union(deliveries.bowler))

    def filter_by_years(df, years_param):
        if years_param == "all":
            return df
        yrs = [int(y) for y in years_param.split(",") if y.isdigit()]
        return df[df.match_id.map(match_season).isin(yrs)]

    @app.route("/api/individual")
    def individual():
        raw = request.args.get("player", "")
        yrs = request.args.get("years", "all")
        if not raw:
            return jsonify({"error":"No player name provided"}),400
        name = resolve_player_name(raw, ALL_NAMES, deliveries)
        if not name:
            return jsonify({"error":f"No match for “{raw}”"}),404

        df = filter_by_years(deliveries, yrs)
        return jsonify(compute_player_stats(name, df))

    @app.route("/api/batter_vs_bowler")
    def batter_vs_bowler():
        a_raw = request.args.get("playerA","")
        b_raw = request.args.get("playerB","")
        yrs   = request.args.get("years","all")
        a = resolve_player_name(a_raw, ALL_NAMES, deliveries)
        b = resolve_player_name(b_raw, ALL_NAMES, deliveries)
        if not a or not b:
            return jsonify({"error":"Could not resolve one or both names"}),400

        df = filter_by_years(deliveries, yrs)
        df = df[(df.batter==a)&(df.bowler==b)]
        # build a small statset
        balls   = len(df)
        runs    = int(df.batsman_runs.sum())
        sr      = round(runs/balls*100,2) if balls>0 else None
        outs    = int((df.player_dismissed.fillna("")
                          .str.lower()==a.lower()).sum())
        return jsonify({
          "batter":a, "bowler":b,
          "balls_faced":balls,
          "runs_scored":runs,
          "strike_rate":sr,
          "times_out":outs
        })

    @app.route("/api/player_vs_player")
    def player_vs_player():
        a_raw = request.args.get("playerA","")
        b_raw = request.args.get("playerB","")
        yrs   = request.args.get("years","all")
        pa = resolve_player_name(a_raw, ALL_NAMES, deliveries)
        pb = resolve_player_name(b_raw, ALL_NAMES, deliveries)
        if not pa or not pb:
            return jsonify({"error":"Could not resolve names"}),400

        df = filter_by_years(deliveries, yrs)
        statsA = compute_player_stats(pa, df)
        statsB = compute_player_stats(pb, df)
        return jsonify({"playerA": statsA, "playerB": statsB})
