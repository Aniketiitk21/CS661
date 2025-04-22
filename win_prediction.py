# win_prediction.py
from flask import jsonify, request
from playerValue import compute_career_average_points

def compute_team_points(deliveries, matches, players, years="all"):
    total_points = 0
    for player in players:
        total_points += compute_career_average_points(deliveries, matches, player, years)
    return total_points

def predict_winner(deliveries, matches, team1, team2, years="all"):
    team1_points = compute_team_points(deliveries, matches, team1, years)
    team2_points = compute_team_points(deliveries, matches, team2, years)
    print(f"Team 1:{team1_points} Team 2:{team2_points}")
    result = {
        "team1_score": team1_points,
        "team2_score": team2_points,
        "predicted_winner": team1 if team1_points > team2_points else team2
    }
    return result

def register_routes(app, deliveries, matches):
    """
    Register all the necessary routes for win prediction
    """
    @app.route("/api/win_prediction")
    def win_prediction():
        team1 = request.args.get("team1").split(",")
        team2 = request.args.get("team2").split(",")
        years = request.args.get("years", "all")

        result = predict_winner(deliveries, matches, team1, team2, years)
        return jsonify(result)
