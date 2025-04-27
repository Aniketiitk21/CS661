# app.py ────────────────────────────────────────────────────────────────
import os
from datetime import datetime
from functools import lru_cache

import pandas as pd
from flask import Flask, render_template, request, jsonify

from pointValue import compute_top25_players


# ── 1. Load match & delivery data once ─────────────────────────────────
BASE = os.path.dirname(os.path.abspath(__file__))
matches    = pd.read_csv(os.path.join(BASE, "data", "matches.csv"), parse_dates=["date"])
deliveries = pd.read_csv(os.path.join(BASE, "data", "deliveries.csv"))

# ── 2. Flask app bootstrap ────────────────────────────────────────────
app = Flask(__name__, static_folder="frontend", static_url_path="")

@app.context_processor
def inject_now():
    return {"current_year": datetime.utcnow().year}


# ── 3. KPI helper for the Home page ───────────────────────────────────
def compute_kpis(matches_df, deliveries_df):
    total_runs   = deliveries_df["total_runs"].sum()
    avg_run_rate = total_runs / (len(deliveries_df) / 6)
    total_wkts   = deliveries_df["player_dismissed"].notna().sum()
    matches_per_season = matches_df.groupby("season").size().mean()

    return dict(
        total_runs         = f"{total_runs:,}",
        avg_run_rate       = f"{avg_run_rate:.2f}",
        total_wickets      = f"{total_wkts:,}",
        matches_per_season = f"{matches_per_season:.0f}",
    )


# ── 4. Cached Top-25 helper for the word-cloud ────────────────────────
@lru_cache(maxsize=32)
def _cached_top25(years: str = "all"):
    df = compute_top25_players(deliveries, matches, years)
    return [
        {"text": r.player, "size": round(r.avg_points, 1)}
        for r in df.itertuples(index=False)
    ]

_cached_top25("all")          # warm cache at startup ✔


# ── 5. Register blueprint / route modules ─────────────────────────────
from top10         import register_routes           as register_top10
from teams         import register_team_routes
from individual    import register_individual_routes
from win_prediction import register_routes          as register_win_prediction
from team_stats    import register_team_stats_routes
from wordcloud     import register_wordcloud_routes
from season_stats  import register_routes           as register_season_stats

register_top10(app, matches, deliveries)
register_team_routes(app, matches, deliveries)
register_individual_routes(app, matches, deliveries)
register_win_prediction(app, deliveries, matches)
register_team_stats_routes(app, matches, deliveries)
register_wordcloud_routes(app, matches, deliveries)
register_season_stats(app, matches, deliveries)


# ── 6. Jinja page routes (ONE copy only!) ─────────────────────────────
@app.route("/")
def home():
    return render_template("home.html", **compute_kpis(matches, deliveries))

@app.route("/ipldata")
def ipldata():
    return render_template("ipldata.html")

@app.route("/teamstats")
def teamstats():
    return render_template("teamstats.html")

@app.route("/playerstats")
def playerstats():
    return render_template("playerstats.html")

@app.route("/seasonstats")
def seasonstats():
    return render_template("seasonstats.html")

@app.route("/contests")
def contests():
    return render_template("contests.html")

@app.route("/winprediction")
def winprediction():
    return render_template("winprediction.html")


# ── 7. JSON API for the word-cloud ────────────────────────────────────
@app.route("/api/wordcloud")
def api_wordcloud():
    years = request.args.get("years", "all")
    try:
        return jsonify(_cached_top25(years))
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


# ── 8. Run the server ─────────────────────────────────────────────────
if __name__ == "__main__":
    # In production: debug=False  (or use `flask run --no-reload`)
    app.run(debug=True)
