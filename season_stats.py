# season_stats.py
from flask import request, jsonify

def register_routes(app, matches, deliveries):
    # Build match_id → season map
    match_season = dict(zip(matches["id"], matches["date"].dt.year))

    # Annotate every delivery with its season
    df_all = deliveries.copy()
    df_all["season"] = df_all["match_id"].map(match_season)

    # Annotate matches with season
    matches_all = matches.copy()
    matches_all["season"] = matches_all["date"].dt.year

    # Which dismissal kinds count as bowler-credited wickets?
    BOWLER_DISMISSALS = {
        "bowled", "caught", "lbw", "stumped",
        "caught and bowled", "hit wicket"
    }

    def _filter_by_season(df, years_param, season_col="season"):
        """Return only rows whose season is in years_param or all if 'all'."""
        if years_param == "all":
            return df
        try:
            years = [int(y) for y in years_param.split(",")]
            return df[df[season_col].isin(years)]
        except ValueError:
            return df

    @app.route("/api/orange_cap")
    def orange_cap():
        years = request.args.get("years", "all")
        df = _filter_by_season(df_all, years)
        top = (
            df.groupby("batter")["batsman_runs"]
              .sum()
              .nlargest(1)
              .reset_index(name="total_runs")
        )
        return jsonify(top.to_dict(orient="records"))

    @app.route("/api/purple_cap")
    def purple_cap():
        years = request.args.get("years", "all")
        df_wk = df_all[df_all["dismissal_kind"].isin(BOWLER_DISMISSALS)]
        df_wk = _filter_by_season(df_wk, years)
        top = (
            df_wk.groupby("bowler")["dismissal_kind"]
                 .count()
                 .nlargest(1)
                 .reset_index(name="wickets")
        )
        return jsonify(top.to_dict(orient="records"))

    @app.route("/api/batsmen_scatter_data")
    def batsmen_scatter_data():
        years = request.args.get("years", "all")
        df = _filter_by_season(df_all, years)
        df["is_six"] = (df["batsman_runs"] == 6).astype(int)
        df["is_four"] = (df["batsman_runs"] == 4).astype(int)
        agg = (
            df.groupby("batter")
              .agg(
                  runs        = ("batsman_runs", "sum"),
                  balls       = ("ball", "count"),
                  sixes       = ("is_six", "sum"),
                  fours       = ("is_four", "sum"),
              )
              .assign(strike_rate=lambda d: d["runs"] / d["balls"] * 100)
              .nlargest(50, "runs")
              .reset_index()[["batter", "runs", "strike_rate", "sixes", "fours"]]
        )
        return jsonify(agg.to_dict(orient="records"))

    @app.route("/api/bowlers_scatter_data")
    def bowlers_scatter_data():
        years = request.args.get("years", "all")
        df_season = _filter_by_season(df_all, years)
        df_wk = df_season[df_season["dismissal_kind"].isin(BOWLER_DISMISSALS)]
        wicket_counts = df_wk.groupby("bowler")["dismissal_kind"].count()
        top_bowlers = wicket_counts.nlargest(50).index.tolist()

        # mark dot balls: total_runs == 0
        df_season["is_dot"] = (df_season["total_runs"] == 0).astype(int)

        sub = df_season[df_season["bowler"].isin(top_bowlers)]
        agg = (
            sub.groupby("bowler")
               .agg(
                   wickets        = ("dismissal_kind", lambda s: s.isin(BOWLER_DISMISSALS).sum()),
                   runs_conceded  = ("total_runs", "sum"),
                   balls          = ("ball", "count"),
                   dot_balls      = ("is_dot", "sum")
               )
        )
        agg["economy_rate"] = agg["runs_conceded"] * 6 / agg["balls"]
        agg = agg.loc[top_bowlers]
        result = agg.reset_index()[["bowler", "wickets", "economy_rate", "dot_balls"]]
        return jsonify(result.to_dict(orient="records"))

    @app.route("/api/season_summary")
    def season_summary():
        """
        Returns overall season metrics for the selected season(s):
          - total_sixes
          - total_fours
          - total_dot_balls
          - avg_innings_score
          - avg_wickets_per_match
        """
        years = request.args.get("years", "all")
        # filter deliveries & matches
        df = _filter_by_season(df_all, years)
        matches_df = _filter_by_season(matches_all, years, season_col="season")

        # total sixes, fours, dot balls
        total_sixes     = int((df["batsman_runs"] == 6).sum())
        total_fours     = int((df["batsman_runs"] == 4).sum())
        total_dot_balls = int((df["total_runs"] == 0).sum())

        # avg innings score: group by match_id & inning
        innings_scores = (
            df.groupby(["match_id", "inning"])["total_runs"]
              .sum()
        )
        avg_innings_score = float(innings_scores.mean())

        # avg wickets per match: count bowler-credited dismissals per match
        df_wk = df[df["dismissal_kind"].isin(BOWLER_DISMISSALS)]
        wickets_per_match = df_wk.groupby("match_id")["dismissal_kind"].count()
        avg_wickets_per_match = float(wickets_per_match.mean())

        summary = {
            "total_sixes": total_sixes,
            "total_fours": total_fours,
            "total_dot_balls": total_dot_balls,
            "avg_innings_score": avg_innings_score,
            "avg_wickets_per_match": avg_wickets_per_match
        }
        return jsonify(summary)
