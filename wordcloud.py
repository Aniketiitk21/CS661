from flask import request, jsonify, current_app
import pandas as pd
from pointValue import compute_top25_players  # now bundled in pointValue.py

def register_wordcloud_routes(app, matches: pd.DataFrame, deliveries: pd.DataFrame):
    @app.route("/api/wordcloud")
    def wordcloud():
        years = request.args.get("years", "all").strip()
        try:
            df_top = compute_top25_players(deliveries, matches, years)
        except Exception:
            current_app.logger.exception("bulk MVP failure")
            return jsonify({"error": "Failed computing MVPs"}), 500

        out = [{"text": r["player"], "size": r["avg_points"]} 
               for _, r in df_top.iterrows()]
        return jsonify(out)
