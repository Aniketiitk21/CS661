# teams.py

import pandas as pd
from flask import request, jsonify

WICKET_KINDS = {
    "bowled", "caught", "lbw", "stumped",
    "caught and bowled", "hit wicket"
}

def register_team_routes(app, matches: pd.DataFrame, deliveries: pd.DataFrame):
    """
    Registers:
      - /api/team_wins
      - /api/team_winners
      - /api/points_table
    """

    # 1) Build season column
    df_all = matches.copy()
    df_all["season"] = df_all["date"].dt.year

    @app.route("/api/team_wins")
    def team_wins():
        yrs = request.args.get("years", "all")
        df = df_all if yrs == "all" else df_all[df_all["season"].isin(map(int, yrs.split(",")))]
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
        finals = df_all[df_all["match_type"].str.lower() == "final"]
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
        # 1) season param
        year = request.args.get("year")
        if not year or not year.isdigit():
            return jsonify({"error": "Provide a valid year"}), 400
        year = int(year)

        # 2) league matches
        df = df_all[
            (df_all["season"] == year) &
            (df_all["match_type"].str.lower() == "league")
        ]

        # 3) init stats
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

        # 4) process matches
        for _, row in df.iterrows():
            t1, t2   = row["team1"], row["team2"]
            match_id = row["id"]
            target   = row["target_runs"]
            margin   = row["result_margin"]
            result   = row["result"].lower()
            o_alloc  = row["target_overs"]

            stats[t1]["matches_played"] += 1
            stats[t2]["matches_played"] += 1

            # team1 always scores target-1
            r1 = target - 1
            # team2 runs from deliveries
            r2 = int(
                deliveries.loc[
                  (deliveries["match_id"] == match_id) &
                  (deliveries["batting_team"] == t2),
                  "batsman_runs"
                ].sum()
            )

            # team1 overs faced is allocated
            o1 = o_alloc

            if result == "runs":
                # team1 defended; team2 lost by runs
                o2 = o_alloc
                winner, loser = t1, t2
            else:
                # team2 chased
                # check if bowled out: count wicket dismissals
                dl = deliveries[
                    (deliveries["match_id"] == match_id) &
                    (deliveries["batting_team"] == t2)
                ]
                wk = dl["dismissal_kind"].isin(WICKET_KINDS).sum()
                if wk >= 10:
                    # bowled out → full allocation
                    o2 = o_alloc
                else:
                    # otherwise actual balls faced
                    balls2 = dl.shape[0]
                    o2 = balls2 / 6
                winner, loser = t2, t1

            # update runs
            stats[t1]["runs_scored"]   += r1
            stats[t1]["runs_conceded"] += r2
            stats[t2]["runs_scored"]   += r2
            stats[t2]["runs_conceded"] += r1

            # update overs
            stats[t1]["overs_faced"]  += o1
            stats[t1]["overs_bowled"] += o2
            stats[t2]["overs_faced"]  += o2
            stats[t2]["overs_bowled"] += o1

            # wins/losses
            if pd.notna(row["winner"]):
                stats[winner]["wins"]  += 1
                stats[loser]["losses"] += 1

        # 5) equalize matches & compute no_result
        max_mp = max(s["matches_played"] for s in stats.values())
        for s in stats.values():
            played     = s["matches_played"]
            no_result  = max_mp - played
            s["matches_played"] = max_mp
            s["no_result"]      = no_result

        # 6) compute points & NRR
        for s in stats.values():
            s["points"] = s["wins"] * 2 + s["no_result"]
            if s["overs_faced"] > 0 and s["overs_bowled"] > 0:
                nrr = (s["runs_scored"] / s["overs_faced"]) - \
                      (s["runs_conceded"] / s["overs_bowled"])
                s["nrr"] = round(nrr, 3)
            else:
                s["nrr"] = 0.0

        # 7) sort and output
        table = sorted(
            stats.values(),
            key=lambda x: (x["points"], x["nrr"]),
            reverse=True
        )
        result = [
            {
                "team":           row["team"],
                "matches_played": row["matches_played"],
                "wins":           row["wins"],
                "losses":         row["losses"],
                "no_result":      row["no_result"],
                "points":         row["points"],
                "nrr":            row["nrr"]
            }
            for row in table
        ]
        return jsonify(result)
