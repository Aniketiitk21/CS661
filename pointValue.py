# pointValue.py

import pandas as pd

# dismissal kinds that count as wickets (excluding run out)
WICKET_KINDS = {
    "bowled", "caught", "lbw", "stumped",
    "caught and bowled", "hit wicket"
}

def compute_match_points(deliveries: pd.DataFrame, player: str) -> dict:
    """
    Compute per‐match points for `player`. Returns { match_id: points }.
    """
    pts = {}

    # 1) Batting
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

    # 2) Bowling
    if "bowler" in deliveries.columns and "total_runs" in deliveries.columns:
        bowl = deliveries[deliveries["bowler"] == player]
        for mid, df in bowl.groupby("match_id"):
            noball = df["noball_runs"] if "noball_runs" in df else pd.Series(0, index=df.index)
            wide   = df["wide_runs"]   if "wide_runs"   in df else pd.Series(0, index=df.index)

            dot_balls     = (df["total_runs"] == 0).sum()
            wickets       = df["dismissal_kind"].isin(WICKET_KINDS).sum()
            lbw_bowled    = df["dismissal_kind"].isin({"lbw", "bowled"}).sum()
            runs_conceded = df["total_runs"].sum()

            legal = df[(noball == 0) & (wide == 0)]
            balls_bowled = len(legal)
            overs = balls_bowled / 6 if balls_bowled > 0 else 0

            maidens = 0
            if "inning" in df.columns and "over" in df.columns:
                for (_, over), sub in df.groupby(["inning", "over"]):
                    sub_nb = sub["noball_runs"] if "noball_runs" in sub else pd.Series(0, index=sub.index)
                    sub_wd = sub["wide_runs"]   if "wide_runs"   in sub else pd.Series(0, index=sub.index)
                    leg = sub[(sub_nb == 0) & (sub_wd == 0)]
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

    # 3) Fielding
    if "fielder" in deliveries.columns and "dismissal_kind" in deliveries.columns:
        fld = deliveries[deliveries["fielder"] == player]
        for mid, df in fld.groupby("match_id"):
            catches   = (df["dismissal_kind"] == "caught").sum()
            stumpings = (df["dismissal_kind"] == "stumped").sum()
            runouts   = (df["dismissal_kind"] == "run out").sum()

            f_pts = catches * 8 + (4 if catches >= 3 else 0) + stumpings * 12 + runouts * 6
            pts.setdefault(mid, 0)
            pts[mid] += f_pts

    return pts


def compute_career_average_points(
    deliveries: pd.DataFrame,
    matches: pd.DataFrame,
    player: str,
    years: str = "all"
) -> float:
    """
    Compute career average points per match for `player` over selected years.
    """
    m = matches.copy()
    m["season"] = pd.to_datetime(m["date"]).dt.year
    if years != "all":
        try:
            yrs = [int(y) for y in years.split(",")]
            valid_ids = m[m["season"].isin(yrs)]["id"].tolist()
        except ValueError:
            valid_ids = m["id"].tolist()
    else:
        valid_ids = m["id"].tolist()

    deliv = deliveries[deliveries["match_id"].isin(valid_ids)].copy()
    match_pts = compute_match_points(deliv, player)
    if not match_pts:
        return 0.0
    return sum(match_pts.values()) / len(match_pts)


def compute_top25_players(
    deliveries: pd.DataFrame,
    matches: pd.DataFrame,
    years: str = "all"
) -> pd.DataFrame:
    """
    Bulk version: returns a DataFrame of the top 25 players by career
    average points over the specified seasons. Filters out any player
    who hasn’t played at least half the maximum matches in those years.
    Columns: ['player','avg_points'].
    """
    # 1) filter matches by season
    m = matches.copy()
    m["season"] = pd.to_datetime(m["date"]).dt.year
    if years != "all":
        try:
            yrs = [int(y) for y in years.split(",")]
            valid = m[m["season"].isin(yrs)]["id"]
        except ValueError:
            valid = m["id"]
    else:
        valid = m["id"]

    # 2) restrict deliveries
    d = deliveries[deliveries["match_id"].isin(valid)].copy()

    # 3) batting subtotals
    if "batter" in d.columns and "batsman_runs" in d.columns:
        bat = (
            d.groupby(["batter", "match_id"])
             .agg(
                runs  = ("batsman_runs", "sum"),
                balls = ("batsman_runs", "count"),
                fours = ("batsman_runs", lambda x: (x == 4).sum()),
                sixes = ("batsman_runs", lambda x: (x == 6).sum())
             )
             .reset_index()
        )
        def _bat_pts(r):
            runs, balls, fours, sixes = r["runs"], r["balls"], r["fours"], r["sixes"]
            sr = runs / balls * 100 if balls > 0 else 0
            pts = runs + fours*4 + sixes*6
            if runs >= 100:   pts += 16
            elif runs >= 75:  pts += 12
            elif runs >= 50:  pts += 8
            elif runs > 25:   pts += 4
            if sr > 170:      pts += 6
            elif sr > 150:    pts += 4
            elif sr >= 130:   pts += 2
            elif 60 <= sr < 70: pts -= 2
            elif 50 <= sr < 60: pts -= 4
            elif sr < 50:       pts -= 6
            return pts
        bat["points"] = bat.apply(_bat_pts, axis=1)
        bat = bat.rename(columns={"batter": "player"})[["player", "match_id", "points"]]
    else:
        bat = pd.DataFrame(columns=["player", "match_id", "points"])

    # 4) bowling subtotals
    if "bowler" in d.columns and "total_runs" in d.columns:
        def _bowl_pts(df):
            noball = df["noball_runs"] if "noball_runs" in df else pd.Series(0, index=df.index)
            wide   = df["wide_runs"]   if "wide_runs"   in df else pd.Series(0, index=df.index)

            dot = (df["total_runs"]==0).sum()
            wkt = df["dismissal_kind"].isin(WICKET_KINDS).sum()
            lbw = df["dismissal_kind"].isin({"lbw","bowled"}).sum()
            runs_c = df["total_runs"].sum()

            legal = df[(noball==0)&(wide==0)]
            balls = len(legal)
            overs = balls/6 if balls > 0 else 0

            mcount = 0
            if "inning" in df and "over" in df:
                for (_,o), sub in df.groupby(["inning","over"]):
                    nb = sub["noball_runs"] if "noball_runs" in sub else pd.Series(0, index=sub.index)
                    wd = sub["wide_runs"]   if "wide_runs"   in sub else pd.Series(0, index=sub.index)
                    leg = sub[(nb==0)&(wd==0)]
                    if len(leg)==6 and leg["total_runs"].sum()==0:
                        mcount+=1

            pts = dot + wkt*30 + lbw*8 + (4 if wkt==3 else 8 if wkt==4 else 12 if wkt>=5 else 0) + mcount*12
            rpo = runs_c/overs if overs else float("inf")
            if rpo < 5:    pts += 6
            elif rpo < 6:  pts += 4
            elif rpo < 7:  pts += 2
            elif rpo > 12: pts -= 6
            elif rpo > 11: pts -= 4
            elif rpo > 10: pts -= 2
            return pts

        bwl = (
            d.groupby(["bowler","match_id"])
             .apply(_bowl_pts)
             .reset_index(name="points")
        ).rename(columns={"bowler": "player"})
    else:
        bwl = pd.DataFrame(columns=["player","match_id","points"])

    # 5) fielding subtotals
    if "fielder" in d.columns and "dismissal_kind" in d.columns:
        def _fld_pts(df):
            c = (df["dismissal_kind"]=="caught").sum()
            s = (df["dismissal_kind"]=="stumped").sum()
            r = (df["dismissal_kind"]=="run out").sum()
            return c*8 + (4 if c>=3 else 0) + s*12 + r*6

        fld = (
            d.groupby(["fielder","match_id"])
             .apply(_fld_pts)
             .reset_index(name="points")
        ).rename(columns={"fielder": "player"})
    else:
        fld = pd.DataFrame(columns=["player","match_id","points"])

    # 6) combine & per‐player aggregation
    combined = pd.concat([bat,bwl,fld], ignore_index=True)
    per_match = (
        combined
        .groupby(["player","match_id"])["points"]
        .sum()
        .reset_index()
    )
    per_player = (
        per_match
        .groupby("player")
        .agg(
          total_pts = ("points","sum"),
          matches   = ("match_id","nunique")
        )
        .reset_index()
    )
    per_player["avg_points"] = per_player["total_pts"] / per_player["matches"]

    # 7) filter players by at least half of max matches
    max_matches = per_player["matches"].max()
    threshold   = max_matches / 2
    eligible    = per_player[per_player["matches"] >= threshold]

    # 8) return top 25 among eligible
    return eligible.nlargest(25, "avg_points")[["player","avg_points"]]
