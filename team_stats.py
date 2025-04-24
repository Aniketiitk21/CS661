# team_stats.py

import pandas as pd
from flask import request, jsonify

# dismissal kinds that count as wickets
WICKET_KINDS = {
    "bowled", "caught", "lbw", "stumped",
    "caught and bowled", "hit wicket"
}

def register_team_stats_routes(app,
                              matches: pd.DataFrame,
                              deliveries: pd.DataFrame):
    """
    Registers:
      - GET /api/team_stats
      - GET /api/team_stats_compare
      - GET /api/team_vs_team
      - GET /api/team_overview

    Also prints the list of all distinct teams from matches.csv to the console.
    """

    # 1) Tag each match with its season
    df_all = matches.copy()
    df_all["season"] = df_all["date"].dt.year

    # --- new: print distinct team names ---
    all_teams = sorted(set(df_all["team1"]).union(df_all["team2"]))
    print("Unique teams in matches.csv:", all_teams)

    def _filter_by_years(df: pd.DataFrame, years_param: str):
        if years_param != "all":
            try:
                yrs = [int(y) for y in years_param.split(",")]
                return df[df["season"].isin(yrs)]
            except ValueError:
                pass
        return df

    # 2) Compute overall / home / away stats for one team
    def _compute_stats_for(team: str, years: str):
        df = _filter_by_years(df_all, years)
        df_team = df[(df["team1"] == team) | (df["team2"] == team)]
        if df_team.empty:
            return None

        def comp(sub: pd.DataFrame):
            m  = len(sub)
            w  = int((sub["winner"] == team).sum())
            nr = int(sub["winner"].isna().sum())
            l  = m - w - nr
            return {
                "matches_played": m,
                "wins": w,
                "losses": l,
                "no_result": nr
            }

        return {
            "team": team,
            "stats": [
                {"type": "All",  **comp(df_team)},
                {"type": "Home", **comp(df_team[df_team["team1"] == team])},
                {"type": "Away", **comp(df_team[df_team["team2"] == team])}
            ]
        }

    # 3) Compare two teams
    def _compute_compare(teamA: str, teamB: str, years: str):
        return _compute_stats_for(teamA, years), _compute_stats_for(teamB, years)

    # 4) Head-to-head between two teams
    def _compute_head2head(teamA: str, teamB: str, years: str):
        df = _filter_by_years(df_all, years)
        mask = (
            ((df["team1"] == teamA) & (df["team2"] == teamB)) |
            ((df["team1"] == teamB) & (df["team2"] == teamA))
        )
        df_h2h = df[mask]
        if df_h2h.empty:
            return None

        df_homeA = df_h2h[df_h2h["team1"] == teamA]
        df_homeB = df_h2h[df_h2h["team1"] == teamB]

        def comp(sub: pd.DataFrame):
            t  = len(sub)
            wA = int((sub["winner"] == teamA).sum())
            wB = int((sub["winner"] == teamB).sum())
            nr = int(sub["winner"].isna().sum())
            return {
                "matches": t,
                "winsA": wA,
                "winsB": wB,
                "no_result": nr
            }

        return [
            {"type": "All",    **comp(df_h2h)},
            {"type": "Home A", **comp(df_homeA)},
            {"type": "Home B", **comp(df_homeB)}
        ]

    @app.route("/api/team_stats")
    def team_stats():
        team  = request.args.get("team", "").strip()
        years = request.args.get("years", "all").strip()
        if not team:
            return jsonify({"error": "Please provide a team name"}), 400

        result = _compute_stats_for(team, years)
        if result is None:
            return jsonify({"error": f"No matches found for '{team}'"}), 404
        return jsonify(result)

    @app.route("/api/team_stats_compare")
    def team_stats_compare():
        teamA = request.args.get("teamA", "").strip()
        teamB = request.args.get("teamB", "").strip()
        years = request.args.get("years", "all").strip()
        if not teamA or not teamB:
            return jsonify({"error": "Provide both teamA and teamB"}), 400

        statsA, statsB = _compute_compare(teamA, teamB, years)
        missing = [t for t,s in [(teamA,statsA),(teamB,statsB)] if s is None]
        if missing:
            return jsonify({"error": f"No matches found for {', '.join(missing)}"}), 404

        return jsonify({"teamA": statsA, "teamB": statsB})

    @app.route("/api/team_vs_team")
    def team_vs_team():
        teamA = request.args.get("teamA", "").strip()
        teamB = request.args.get("teamB", "").strip()
        years = request.args.get("years", "all").strip()
        if not teamA or not teamB:
            return jsonify({"error": "Provide both teamA and teamB"}), 400

        stats = _compute_head2head(teamA, teamB, years)
        if stats is None:
            return jsonify({"error": f"No matches between '{teamA}' and '{teamB}'"}), 404

        return jsonify({"teamA": teamA, "teamB": teamB, "stats": stats})

    @app.route("/api/team_overview")
    def team_overview():
        team  = request.args.get("team", "").strip()
        years = request.args.get("years", "all").strip()
        if not team:
            return jsonify({"error": "Please provide a team name"}), 400

        df = _filter_by_years(df_all, years)
        df_team = df[(df["team1"] == team) | (df["team2"] == team)]
        if df_team.empty:
            return jsonify({"error": f"No matches for '{team}' in {years}"}), 404

        match_ids = df_team["id"].tolist()
        df_del = deliveries[deliveries["match_id"].isin(match_ids)]

        # 1) Top 5 run-scorers
        df_bat = df_del[df_del["batting_team"] == team]
        top5_bat = (
            df_bat.groupby("batter")["batsman_runs"]
                  .sum()
                  .nlargest(5)
                  .reset_index(name="runs")
                  .to_dict("records")
        )

        # 2) Top 5 wicket-takers
        df_bowl = df_del[
            (df_del["bowling_team"] == team) &
            (df_del["dismissal_kind"].isin(WICKET_KINDS))
        ]
        top5_bowl = (
            df_bowl.groupby("bowler")
                   .size()
                   .nlargest(5)
                   .reset_index(name="wickets")
                   .to_dict("records")
        )

        # 3) Top 5 successful chases (by highest target_runs)
        df_chase = df_team[
            (df_team["winner"] == team) &
            (df_team["result"].str.lower() == "wickets")
        ]
        chase5 = df_chase.nlargest(5, "target_runs")
        top5_chase = []
        for _, row in chase5.iterrows():
            opp = row["team2"] if row["team1"] == team else row["team1"]
            top5_chase.append({
                "opposition": opp,
                "target":     row["target_runs"]
            })

        # 4) Top 5 defenses (lowest total defended first)
        df_def = df_team[
            (df_team["winner"] == team) &
            (df_team["result"].str.lower() == "runs") &
            (df_team["method"].fillna("").str.lower() != "d/l") &
            (df_team["target_overs"] == 20)
        ]
        def5 = df_def.nsmallest(5, "target_runs")
        top5_def = []
        for _, row in def5.iterrows():
            opp = row["team2"] if row["team1"] == team else row["team1"]
            top5_def.append({
                "opposition": opp,
                "target":     row["target_runs"]
            })

        return jsonify({
            "team":          team,
            "years":         years,
            "top5_batters":  top5_bat,
            "top5_bowlers":  top5_bowl,
            "top5_chases":   top5_chase,
            "top5_defenses": top5_def
        })
