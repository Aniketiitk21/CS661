import pandas as pd

# dismissal kinds that count as wickets (excluding run out)
WICKET_KINDS = {
    "bowled", "caught", "lbw", "stumped",
    "caught and bowled", "hit wicket"
}


def resolve_player_name(raw: str, all_names: list, deliveries: pd.DataFrame) -> str | None:
    """
    Resolve the player's name by exact match, then surname+initial fallback,
    then pick the candidate with the most matches.
    """
    q = raw.strip()
    if not q:
        return None

    # 1) exact
    for name in all_names:
        if name.lower() == q.lower():
            return name

    # 2) surname + initial
    parts = q.lower().split()
    if len(parts) < 2:
        return None
    surname, initial = parts[-1], parts[0][0]
    candidates = [
        name for name in all_names
        if name.lower().split()[-1] == surname
        and name.split()[0][0].lower() == initial
    ]
    if not candidates:
        return None

    def match_count(p):
        dfp = deliveries[
            (deliveries["batter"] == p) |
            (deliveries["bowler"]  == p)
        ]
        return dfp["match_id"].nunique()

    return max(candidates, key=match_count)


def compute_match_points(deliveries: pd.DataFrame, player: str) -> dict:
    """
    Compute per-match breakdown of batting, bowling, and fielding points for `player`.
    Returns a dict of three sub-dicts:
      {
        "batting": { match_id: points, … },
        "bowling": { match_id: points, … },
        "fielding": { match_id: points, … }
      }
    """
    batting_pts = {}
    bowling_pts = {}
    fielding_pts = {}

    # 1) Batting points
    if "batter" in deliveries and "batsman_runs" in deliveries:
        bat = deliveries[deliveries["batter"] == player]
        for mid, grp in bat.groupby("match_id"):
            runs  = grp["batsman_runs"].sum()
            balls = len(grp)
            fours = (grp["batsman_runs"] == 4).sum()
            sixes = (grp["batsman_runs"] == 6).sum()
            sr    = (runs / balls * 100) if balls else 0.0

            pts = runs + fours*4 + sixes*6
            if runs >= 100:   pts += 16
            elif runs >= 75:  pts += 12
            elif runs >= 50:  pts += 8
            elif runs >  25:  pts += 4
            if sr > 170:      pts += 6
            elif sr > 150:    pts += 4
            elif sr >= 130:   pts += 2
            elif 60 <= sr < 70:  pts -= 2
            elif 50 <= sr < 60:  pts -= 4
            elif sr <  50:       pts -= 6

            batting_pts[mid] = batting_pts.get(mid, 0) + pts

    # 2) Bowling points
    if "bowler" in deliveries and "total_runs" in deliveries:
        bowl = deliveries[deliveries["bowler"] == player]
        for mid, grp in bowl.groupby("match_id"):
            # dot balls
            et = grp["extras_type"].fillna("")
            dot_balls = ((grp["total_runs"] == 0) & ~et.isin(["wides","noballs"])).sum()
            wickets    = grp["dismissal_kind"].isin(WICKET_KINDS).sum()
            lbw_bowled = grp["dismissal_kind"].isin({"lbw","bowled"}).sum()
            runs_c     = grp["total_runs"].sum()
            legal      = grp[~et.isin(["wides","noballs"])]
            balls      = len(legal)
            overs      = balls / 6 if balls else 0

            # maiden overs
            maidens = 0
            if {"inning","over"}.issubset(grp.columns):
                for (_, ov), sub in grp.groupby(["inning","over"]):
                    sub_et = sub["extras_type"].fillna("")
                    leg    = sub[~sub_et.isin(["wides","noballs"])]
                    if len(leg) == 6 and leg["total_runs"].sum() == 0:
                        maidens += 1

            pts = (
                dot_balls * 1 +
                wickets   * 30 +
                lbw_bowled * 8 +
                (4 if wickets == 3 else 8 if wickets == 4 else 12 if wickets >= 5 else 0) +
                maidens   * 12
            )
            rpo = (runs_c / overs) if overs else float("inf")
            if rpo < 5:     pts += 6
            elif rpo < 6:   pts += 4
            elif rpo < 7:   pts += 2
            elif rpo > 12:  pts -= 6
            elif rpo > 11:  pts -= 4
            elif rpo > 10:  pts -= 2

            bowling_pts[mid] = bowling_pts.get(mid, 0) + pts

    # 3) Fielding points
    if "fielder" in deliveries and "dismissal_kind" in deliveries:
        fld = deliveries[deliveries["fielder"] == player]
        for mid, grp in fld.groupby("match_id"):
            catches   = (grp["dismissal_kind"] == "caught").sum()
            stumpings = (grp["dismissal_kind"] == "stumped").sum()
            runouts   = (grp["dismissal_kind"] == "run out").sum()
            pts = catches*8 + (4 if catches >= 3 else 0) + stumpings*12 + runouts*6
            fielding_pts[mid] = fielding_pts.get(mid, 0) + pts

    return {
        "batting":  batting_pts,
        "bowling":  bowling_pts,
        "fielding": fielding_pts
    }


def compute_career_average_points(
    deliveries: pd.DataFrame,
    matches: pd.DataFrame,
    player: str,
    years: str = "all"
) -> dict:
    """
    Resolve the player's name, then compute career average points per match
    for batting, bowling, and fielding separately, over the selected years.
    Returns a dict: { batting: x, bowling: y, fielding: z }.
    """
    all_names = sorted(
        set(deliveries["batter"].dropna()) |
        set(deliveries["bowler"].dropna())
    )
    resolved = resolve_player_name(player, all_names, deliveries)
    if not resolved:
        return {"batting": 0.0, "bowling": 0.0, "fielding": 0.0}

    # filter valid match IDs by season
    if years != "all":
        try:
            yrs = [int(y) for y in years.split(",")]
            valid_ids = set(matches[matches["date"].dt.year.isin(yrs)]["id"])
        except Exception:
            valid_ids = set(matches["id"])
    else:
        valid_ids = set(matches["id"])

    # restrict deliveries and compute per-match breakdown
    df = deliveries[deliveries["match_id"].isin(valid_ids)]
    breakdown = compute_match_points(df, resolved)

    # compute per-category average
    def avg(d):
        return sum(d.values())/len(d) if d else 0.0

    return {
        "batting":  avg(breakdown["batting"]),
        "bowling":  avg(breakdown["bowling"]),
        "fielding": avg(breakdown["fielding"])
    }
