import os
import pandas as pd
from flask import Flask, render_template

# 1) Load data once
BASE = os.path.dirname(os.path.abspath(__file__))
matches    = pd.read_csv(os.path.join(BASE, "data", "matches.csv"),    parse_dates=["date"])
deliveries = pd.read_csv(os.path.join(BASE, "data", "deliveries.csv"))

# 2) Create the Flask app
#    - static_folder=frontend serves css/js/images out of that directory
app = Flask(__name__, static_folder="frontend", static_url_path="")

# 3) Register your existing API modules (no change here)
from top10 import register_routes as register_top10
register_top10(app, matches, deliveries)

from teams import register_team_routes
register_team_routes(app, matches, deliveries)

from individual import register_individual_routes
register_individual_routes(app, matches, deliveries)

from win_prediction import register_routes as register_win_prediction
register_win_prediction(app, deliveries, matches)

from team_stats import register_team_stats_routes
register_team_stats_routes(app, matches, deliveries)

from wordcloud import register_wordcloud_routes
register_wordcloud_routes(app, matches, deliveries)

from season_stats import register_routes as register_season_stats
register_season_stats(app, matches, deliveries)

# 4) Page routes—serve Jinja templates out of `templates/`
@app.route("/")
def home():
    return render_template("home.html")

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

if __name__ == "__main__":
    app.run(debug=True)
