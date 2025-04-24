# teams.py

import pandas as pd
from flask import request, jsonify

# kinds of dismissals that count as wickets
WICKET_KINDS = {
    "bowled", "caught", "lbw", "stumped",
    "caught and bowled", "hit wicket"
}

def register_team_routes(app, matches: pd.DataFrame, deliveries: pd.DataFrame):
    """
    Registers:
      - GET /api/team_wins
      - GET /api/team_winners
      - GET /api/points_table
    """

    # 1) Annotate every match with its season
    df_all = matches.copy()
    df_all["season"] = df_all["date"].dt.year

    # 2) Helper to filter by ?years=all or comma-list
    def _filter_by_seasons(df: pd.DataFrame, years_param: str):
        if years_param == "all":
            return df
        try:
            years = [int(y) for y in years_param.split(",")]
            return df[df["season"].isin(years)]
        except ValueError:
            # malformed → no filter
            return df

    @app.route("/api/team_wins")
    def team_wins():
        years = request.args.get("years", "all")
        df = _filter_by_seasons(df_all, years)

        wins = (
            df["winner"]
              .dropna()
              .value_counts()
              .reset_index()
              .rename(columns={"index": "team", "winner": "wins"})
        )
        return jsonify(wins.to_dict(orient="records"))

    @app.route("/api/team_winners")
    def team_winners():
        # now honors ?years=
        years = request.args.get("years", "all")
        df = _filter_by_seasons(df_all, years)

        # only finals
        finals = df[df["match_type"].str.lower() == "final"]
        # one final per season
        finals = finals.drop_duplicates(subset=["season"], keep="first")

        winners = (
            finals
              .groupby("winner")["season"]
              .agg(list)
              .reset_index()
              .rename(columns={"winner": "team", "season": "seasons"})
        )
        winners["titles"] = winners["seasons"].apply(len)
        return jsonify(winners.to_dict(orient="records"))

    @app.route("/api/points_table")
    def points_table():
        year = request.args.get("year")
        if not year or not year.isdigit():
            return jsonify({"error": "Provide a valid year"}), 400
        year = int(year)

        # only league matches in that season
        df = df_all[
            (df_all["season"] == year) &
            (df_all["match_type"].str.lower() == "league")
        ]

        # collect teams
        teams = set(df["team1"]).union(df["team2"])
        stats = {
            t: {
                "team": t,
                "matches_played": 0,
                "wins": 0,
                "losses": 0,
                "runs_scored": 0,
                "runs_conceded": 0,
                "overs_faced": 0.0,
                "overs_bowled": 0.0
            }
            for t in teams
        }

        # process each match
        for _, row in df.iterrows():
            t1, t2   = row["team1"], row["team2"]
            match_id = row["id"]
            target   = row["target_runs"]
            margin   = row["result_margin"]
            result   = row["result"].lower()
            o_alloc  = row["target_overs"]

            stats[t1]["matches_played"] += 1
            stats[t2]["matches_played"] += 1

            # team1 always scores target - 1
            r1 = target - 1
            # team2 actual runs from deliveries
            r2 = int(
                deliveries.loc[
                  (deliveries["match_id"] == match_id) &
                  (deliveries["batting_team"] == t2),
                  "batsman_runs"
                ].sum()
            )

            # overs faced/bowled
            o1 = o_alloc
            if result == "runs":
                # defended → both used full allocation
                o2 = o_alloc
                winner, loser = t1, t2
            else:
                # chase: check if bowled out
                dl = deliveries[
                    (deliveries["match_id"] == match_id) &
                    (deliveries["batting_team"] == t2)
                ]
                wk = dl["dismissal_kind"].isin(WICKET_KINDS).sum()
                if wk >= 10:
                    o2 = o_alloc
                else:
                    o2 = dl.shape[0] / 6
                winner, loser = t2, t1

            # update runs & overs
            stats[t1]["runs_scored"]   += r1
            stats[t1]["runs_conceded"] += r2
            stats[t2]["runs_scored"]   += r2
            stats[t2]["runs_conceded"] += r1

            stats[t1]["overs_faced"]  += o1
            stats[t1]["overs_bowled"] += o2
            stats[t2]["overs_faced"]  += o2
            stats[t2]["overs_bowled"] += o1

            # wins/losses
            if pd.notna(row["winner"]):
                stats[winner]["wins"]  += 1
                stats[loser]["losses"] += 1

        # equalize matches and compute no_result
        max_mp = max(s["matches_played"] for s in stats.values())
        for s in stats.values():
            nr = max_mp - s["matches_played"]
            s["matches_played"] = max_mp
            s["no_result"]      = nr
            s["points"]         = s["wins"] * 2 + nr

            # NRR
            if s["overs_faced"] and s["overs_bowled"]:
                nrr = (s["runs_scored"]   / s["overs_faced"]) - \
                      (s["runs_conceded"] / s["overs_bowled"])
                s["nrr"] = round(nrr, 3)
            else:
                s["nrr"] = 0.0

        # sort & output
        table = sorted(
            stats.values(),
            key=lambda x: (x["points"], x["nrr"]),
            reverse=True
        )
        out = [
            {
                "team":           r["team"],
                "matches_played": r["matches_played"],
                "wins":           r["wins"],
                "losses":         r["losses"],
                "no_result":      r["no_result"],
                "points":         r["points"],
                "nrr":            r["nrr"]
            }
            for r in table
        ]
        return jsonify(out)
