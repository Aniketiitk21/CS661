import pandas as pd

# dismissal kinds that count as wickets (excluding run out)
WICKET_KINDS = {
    "bowled", "caught", "lbw", "stumped",
    "caught and bowled", "hit wicket"
}

def resolve_player_name(raw: str, all_names: list, deliveries: pd.DataFrame) -> str | None:
    """
    Resolve the player's name by matching the input string with valid player names.
    First tries exact matching, then tries surname + initial matching.
    """
    q = raw.strip()
    if not q:
        return None

    # 1) exact
    for name in all_names:
        if name.lower() == q.lower():
            return name

    # 2) surname + initial fallback
    parts  = q.lower().split()
    surname, initial = parts[-1], parts[0][0]
    candidates = [
        name for name in all_names
        if name.lower().split()[-1] == surname
        and name.split()[0][0].lower() == initial
    ]
    if not candidates:
        return None

    # pick by match_count
    def match_count(player):
        dfp = deliveries[
            (deliveries.batter == player) |
            (deliveries.bowler  == player)
        ]
        return dfp.match_id.nunique()

    return max(candidates, key=match_count)


def compute_match_points(deliveries: pd.DataFrame, player: str) -> dict:
    """
    Compute total points per match for `player`. Before anything else,
    prints the names of all extras-related columns and the distinct extras_type values.
    Returns a dict: { match_id: points }.
    """
    # DEBUG: print the actual extras columns and types
    extras_cols = [c for c in deliveries.columns if "extra" in c.lower()]
    # print("Extras‑related columns in deliveries:", extras_cols)
    # if "extras_type" in deliveries.columns:
    #     print("Unique extras_type values:", deliveries["extras_type"].dropna().unique().tolist())

    pts = {}

    # 1) Batting points
    if "batter" in deliveries.columns and "batsman_runs" in deliveries.columns:
        bat = deliveries[deliveries["batter"] == player]
        for mid, df in bat.groupby("match_id"):
            runs  = df["batsman_runs"].sum()
            balls = len(df)
            fours = (df["batsman_runs"] == 4).sum()
            sixes = (df["batsman_runs"] == 6).sum()
            sr    = (runs / balls * 100) if balls > 0 else 0.0

            b_pts = runs + fours*4 + sixes*6
            if runs >= 100:   b_pts += 16
            elif runs >= 75:  b_pts += 12
            elif runs >= 50:  b_pts += 8
            elif runs > 25:   b_pts += 4
            if sr > 170:      b_pts += 6
            elif sr > 150:    b_pts += 4
            elif sr >= 130:   b_pts += 2
            elif 60 <= sr < 70: b_pts -= 2
            elif 50 <= sr < 60: b_pts -= 4
            elif sr < 50:       b_pts -= 6

            pts.setdefault(mid, 0)
            pts[mid] += b_pts
    else:
        print("Missing batting columns.")

    # 2) Bowling points
    if "bowler" in deliveries.columns and "total_runs" in deliveries.columns:
        bowl = deliveries[deliveries["bowler"] == player]
        for mid, df in bowl.groupby("match_id"):
            # count dot balls only if no runs AND not wides/noballs
            etype = df["extras_type"].fillna("")
            dot_balls = ((df["total_runs"] == 0) & (~etype.isin(["wides","noballs"]))).sum()

            wickets    = df["dismissal_kind"].isin(WICKET_KINDS).sum()
            lbw_bowled = df["dismissal_kind"].isin({"lbw","bowled"}).sum()
            runs_conceded = df["total_runs"].sum()

            # legal deliveries exclude wides and noballs
            legal = df[~etype.isin(["wides","noballs"])]
            balls_bowled = len(legal)
            overs = balls_bowled / 6 if balls_bowled > 0 else 0

            # count maiden overs
            maidens = 0
            if {"inning","over"}.issubset(df.columns):
                for (_, over), sub in df.groupby(["inning","over"]):
                    sub_etype = sub["extras_type"].fillna("")
                    leg = sub[~sub_etype.isin(["wides","noballs"])]
                    if len(leg) == 6 and leg["total_runs"].sum() == 0:
                        maidens += 1

            bwl_pts = (
                dot_balls * 1 +
                wickets * 30 +
                lbw_bowled * 8 +
                (4 if wickets == 3 else 8 if wickets == 4 else 12 if wickets >= 5 else 0) +
                maidens * 12
            )
            rpo = (runs_conceded / overs) if overs > 0 else float("inf")
            if rpo < 5:     bwl_pts += 6
            elif rpo < 6:   bwl_pts += 4
            elif rpo < 7:   bwl_pts += 2
            elif rpo > 12:  bwl_pts -= 6
            elif rpo > 11:  bwl_pts -= 4
            elif rpo > 10:  bwl_pts -= 2

            pts.setdefault(mid, 0)
            pts[mid] += bwl_pts
    else:
        print("Missing bowling columns.")

    # 3) Fielding points
    if "fielder" in deliveries.columns and "dismissal_kind" in deliveries.columns:
        fld = deliveries[deliveries["fielder"] == player]
        for mid, df in fld.groupby("match_id"):
            catches   = (df["dismissal_kind"] == "caught").sum()
            stumpings = (df["dismissal_kind"] == "stumped").sum()
            runouts   = (df["dismissal_kind"] == "run out").sum()

            f_pts = catches*8 + (4 if catches >= 3 else 0) + stumpings*12 + runouts*6
            pts.setdefault(mid, 0)
            pts[mid] += f_pts
    else:
        print("Missing fielding columns.")

    return pts


def compute_career_average_points(
    deliveries: pd.DataFrame,
    matches: pd.DataFrame,
    player: str,
    years: str = "all"
) -> float:
    """
    Resolve the player's name, then compute career average points per match
    for `player` over selected years.
    """
    # 1) resolve the raw input to a valid name
    all_names = sorted(set(deliveries["batter"].dropna()) |
                       set(deliveries["bowler"].dropna()))
    resolved = resolve_player_name(player, all_names, deliveries)
    if not resolved:
        print(f"Could not resolve player name '{player}'")
        return 0.0

    # 2) filter match IDs by season
    if years != "all":
        try:
            yrs = [int(y) for y in years.split(",")]
            valid_ids = matches[matches["date"].dt.year.isin(yrs)]["id"].tolist()
        except Exception:
            valid_ids = matches["id"].tolist()
    else:
        valid_ids = matches["id"].tolist()

    # 3) restrict deliveries to those match IDs, and compute points
    deliv = deliveries[deliveries["match_id"].isin(valid_ids)].copy()
    match_pts = compute_match_points(deliv, resolved)

    if not match_pts:
        return 0.0
    return sum(match_pts.values()) / len(match_pts)
