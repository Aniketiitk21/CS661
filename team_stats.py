# team_stats.py

import pandas as pd
from flask import request, jsonify

def register_team_stats_routes(app, matches: pd.DataFrame):
    """
    Registers:
      - GET /api/team_stats
      - GET /api/team_stats_compare
      - GET /api/team_vs_team
    """

    # 1) Precompute seasons on the matches DataFrame
    df_all = matches.copy()
    df_all["season"] = df_all["date"].dt.year

    # 2) Helper: compute All/Home/Away stats for one team
    def _compute_stats_for(team: str, years: str):
        # Filter by seasons
        if years != "all":
            try:
                yrs = [int(y) for y in years.split(",")]
                df = df_all[df_all["season"].isin(yrs)]
            except ValueError:
                df = df_all
        else:
            df = df_all

        # All matches where this team appeared
        df_team = df[(df["team1"] == team) | (df["team2"] == team)]
        mp = len(df_team)
        if mp == 0:
            return None

        # Compute wins, no_results, losses
        wins      = int((df_team["winner"] == team).sum())
        no_result = int(df_team["winner"].isna().sum())
        losses    = mp - wins - no_result

        # Sub‑helper for a subset
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

    # 3) Helper: compute compare for two teams (simple two tables)
    def _compute_compare(teamA: str, teamB: str, years: str):
        statsA = _compute_stats_for(teamA, years)
        statsB = _compute_stats_for(teamB, years)
        return statsA, statsB

    # 4) Helper: compute head‑to‑head between two teams
    def _compute_head2head(teamA: str, teamB: str, years: str):
        # Filter by seasons
        if years != "all":
            try:
                yrs = [int(y) for y in years.split(",")]
                df = df_all[df_all["season"].isin(yrs)]
            except ValueError:
                df = df_all
        else:
            df = df_all

        # Only matches between A and B
        mask = (
            ((df["team1"] == teamA) & (df["team2"] == teamB)) |
            ((df["team1"] == teamB) & (df["team2"] == teamA))
        )
        df_h2h = df[mask]
        total = len(df_h2h)
        if total == 0:
            return None

        # Split home matches
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
            return jsonify({"error": "Please provide both teamA and teamB"}), 400

        statsA, statsB = _compute_compare(teamA, teamB, years)
        missing = []
        if statsA is None: missing.append(teamA)
        if statsB is None: missing.append(teamB)
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
            msg = f"No matches between '{teamA}' and '{teamB}'"
            return jsonify({"error": msg}), 404

        return jsonify({"teamA": teamA, "teamB": teamB, "stats": stats})
