# win_prediction.py

from flask import jsonify, request
from playerValue import compute_career_average_points
import json

def player_points(player, years="all"):
    """
    Returns a dict: { 'batting': x, 'bowling': y, 'fielding': z }
    for the given player over `years`.
    """
    pts = compute_career_average_points(deliveries, matches, player, years)
    # Expect pts to be a dict with keys 'batting','bowling','fielding'
    return (
        float(pts.get("batting", 0.0)),
        float(pts.get("bowling", 0.0)),
        float(pts.get("fielding", 0.0))
    )

def register_routes(app, deliveries_df, matches_df):
    """
    Register /api/win_prediction which takes:
      - team1: comma-sep list of 11 player names
      - team2: same as team1
      - roles1: JSON list of 11 roles ("bat"|"bowl"|"all")
      - roles2: same for team2
      - years: optional comma-sep list or "all"
    Returns batting, bowling, fielding subtotals and overall probabilities.
    """
    # stash these for player_points
    global deliveries, matches
    deliveries, matches = deliveries_df, matches_df

    @app.route("/api/win_prediction")
    def win_prediction():
        # parse teams
        team1 = request.args.get("team1", "")
        team2 = request.args.get("team2", "")
        roles1 = request.args.get("roles1", "")
        roles2 = request.args.get("roles2", "")
        years  = request.args.get("years", "all")

        # defaults if nothing provided:
        if not team1:
            # RCB 2024 squad
            team1 = [
              "Faf du Plessis","Virat Kohli","Glenn Maxwell",
              "Dinesh Karthik","Rajat Patidar","Daniel Sams",
              "Harshal Patel","Mohammad Siraj","Wanindu Hasaranga",
              "Siddharth Kaul","Luvnith Sisodia"
            ]
            roles1 = ["bat","bat","all","bat","bat","all","bowl","bowl","all","bowl","bowl"]
        else:
            team1 = team1.split(",")
        if not team2:
            # Mumbai Indians 2024 squad
            team2 = [
              "Ishan Kishan","Jasprit Bumrah","Hardik Pandya",
              "Suryakumar Yadav","Tim David","Nehal Wadhera",
              "Jaydev Unadkat","Rohit Sharma","Cameron Green",
              "Piyush Chawla","Tymal Mills"
            ]
            roles2 = ["bat","bowl","all","bat","all","bat","bowl","bat","all","bowl","bowl"]
        else:
            team2 = team2.split(",")

        # parse roles if provided
        if roles1:
            try:
                roles1 = json.loads(roles1)
            except ValueError:
                roles1 = ["all"] * len(team1)
        else:
            roles1 = ["all"] * len(team1)
        if roles2:
            try:
                roles2 = json.loads(roles2)
            except ValueError:
                roles2 = ["all"] * len(team2)
        else:
            roles2 = ["all"] * len(team2)

        # accumulate
        t1_bat = t1_bowl = t1_fld = 0.0
        for p, role in zip(team1, roles1):
            b, bo, f = player_points(p, years)
            if role in ("bat", "all"):
                t1_bat  += b
            if role in ("bowl","all"):
                t1_bowl += bo
            # always count fielding
            t1_fld  += f

        t2_bat = t2_bowl = t2_fld = 0.0
        for p, role in zip(team2, roles2):
            b, bo, f = player_points(p, years)
            if role in ("bat", "all"):
                t2_bat  += b
            if role in ("bowl","all"):
                t2_bowl += bo
            t2_fld  += f

        # total “score” for probability
        t1_total = t1_bat + t1_bowl + t1_fld
        t2_total = t2_bat + t2_bowl + t2_fld
        total_sum = t1_total + t2_total
        p1 = (t1_total / total_sum * 100) if total_sum > 0 else 50
        p2 = 100 - p1

        return jsonify({
            "team1": {
              "batting":  round(t1_bat,2),
              "bowling":  round(t1_bowl,2),
              "fielding": round(t1_fld,2),
              "total":    round(t1_total,2),
              "prob":     round(p1,2)
            },
            "team2": {
              "batting":  round(t2_bat,2),
              "bowling":  round(t2_bowl,2),
              "fielding": round(t2_fld,2),
              "total":    round(t2_total,2),
              "prob":     round(p2,2)
            }
        })

