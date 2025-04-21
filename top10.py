# top10.py
from flask import request, jsonify

def register_routes(app, matches, deliveries):
    # Build match_id → season map
    match_season = dict(zip(matches["id"], matches["date"].dt.year))

    # Annotate deliveries with season
    df_all = deliveries.copy()
    df_all["season"] = df_all["match_id"].map(match_season)

    # Which dismissal kinds count as bowler‑credited wickets?
    BOWLER_DISMISSALS = {
        "bowled",
        "caught",
        "lbw",
        "stumped",
        "caught and bowled",
        "hit wicket"
    }

    # Fielding attempts = catches + run outs
    FIELDER_DISMISSALS = {
        "caught",
        "run out"
    }

    def _filter_by_seasons(df, years_param):
        if years_param == "all":
            return df
        try:
            years = [int(y) for y in years_param.split(",")]
            return df[df["season"].isin(years)]
        except ValueError:
            return df

    @app.route("/api/top_batsmen")
    def top_batsmen():
        years_param = request.args.get("years", "all")
        df = _filter_by_seasons(df_all, years_param)

        top10 = (
            df
            .groupby("batter")["batsman_runs"]
            .sum()
            .nlargest(10)
            .reset_index(name="total_runs")
        )
        return jsonify(top10.to_dict(orient="records"))

    @app.route("/api/top_bowlers")
    def top_bowlers():
        years_param = request.args.get("years", "all")
        df = _filter_by_seasons(df_all, years_param)

        # only count dismissals that are credited to the bowler
        df = df[df["dismissal_kind"].isin(BOWLER_DISMISSALS)]

        top10 = (
            df
            .groupby("bowler")["dismissal_kind"]
            .count()
            .nlargest(10)
            .reset_index(name="wickets")
        )
        return jsonify(top10.to_dict(orient="records"))

    @app.route("/api/top_fielders")
    def top_fielders():
        years_param = request.args.get("years", "all")
        df = _filter_by_seasons(df_all, years_param)

        # count both catches and run‑outs
        df = df[df["dismissal_kind"].isin(FIELDER_DISMISSALS)]

        top10 = (
            df
            .groupby("fielder")["dismissal_kind"]
            .count()
            .nlargest(10)
            .reset_index(name="fielding_attempts")
        )
        return jsonify(top10.to_dict(orient="records"))
