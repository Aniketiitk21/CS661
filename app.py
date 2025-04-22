import os
import pandas as pd
from flask import Flask

# 1) Load data once
BASE = os.path.dirname(os.path.abspath(__file__))

matches = pd.read_csv(os.path.join(BASE, "data", "matches.csv"), parse_dates=["date"])
deliveries = pd.read_csv(os.path.join(BASE, "data", "deliveries.csv"))

# 2) Create app
app = Flask(__name__, static_folder="frontend", static_url_path="")

# 3) Register existing modules
from top10 import register_routes as register_top10
register_top10(app, matches, deliveries)

from teams import register_team_routes
register_team_routes(app, matches, deliveries)

# 4) Register individual player module
from individual import register_individual_routes
register_individual_routes(app, matches, deliveries)

from win_prediction import register_routes as register_win_prediction
register_win_prediction(app, deliveries, matches)


from team_stats import register_team_stats_routes
register_team_stats_routes(app, matches)

from wordcloud import register_wordcloud_routes
register_wordcloud_routes(app, matches, deliveries)

# 5) Serve dashboard
@app.route("/")
def index():
    return app.send_static_file("index.html")

if __name__ == "__main__":
    app.run(debug=True)
