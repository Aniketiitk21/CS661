# wordcloud.py

from flask import request, jsonify, current_app
import pandas as pd
from pointValue import compute_career_average_points

def register_wordcloud_routes(app, matches: pd.DataFrame, deliveries: pd.DataFrame):
    """
    GET /api/wordcloud?years=<csv_or_all>
    Returns top 25 players by career avg points. Prints extras_type up front.
    """

    df_matches = matches.copy()
    df_matches["season"] = pd.to_datetime(df_matches["date"]).dt.year

    @app.route("/api/wordcloud")
    def wordcloud():
        years_param = request.args.get("years", "all")

        # 1) which match_ids
        try:
            if years_param != "all":
                yrs = [int(y) for y in years_param.split(",")]
                valid = df_matches[df_matches["season"].isin(yrs)]["id"].tolist()
            else:
                valid = df_matches["id"].tolist()
        except Exception:
            current_app.logger.error("Invalid years: %s", years_param, exc_info=True)
            return jsonify({"error": "Invalid years parameter"}), 400

        # 2) restrict deliveries
        d = deliveries[deliveries["match_id"].isin(valid)]

        # 3) Print extras_type values
        if "extras_type" in d.columns:
            et = d["extras_type"].dropna().unique()
            current_app.logger.info("Unique extras_type values: %s", list(et))
        else:
            current_app.logger.info("No extras_type column present.")

        # 4) build player list
        players = set()
        for col in ("batter", "bowler", "fielder"):
            if col in d.columns:
                players.update(d[col].dropna().unique())

        # 5) compute and collect averages
        scored = []
        for p in players:
            try:
                avg = compute_career_average_points(deliveries, matches, p, years_param)
                if avg > 0:
                    scored.append((p, avg))
            except Exception:
                current_app.logger.exception("Error for player %s", p)
                continue

        # 6) top25 + format
        scored.sort(key=lambda x: x[1], reverse=True)
        top25 = scored[:25]
        out = [{"text": name, "size": pts} for name, pts in top25]
        return jsonify(out)
