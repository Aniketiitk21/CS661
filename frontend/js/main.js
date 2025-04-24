// frontend/js/main.js
import { drawTopBatsmenChart }     from "./top_batsmen.js";
import { drawTopBowlersChart }     from "./top_bowlers.js";
import { drawTopFieldersChart }    from "./top_fielders.js";
import { drawTeamWinsChart }       from "./team_wins.js";
import { drawTeamWinnersPie }      from "./winners.js";
import { drawWordCloud }           from "./wordcloud.js";
import { drawPointsTable }         from "./pointsTable.js";
import { drawTeamStats }           from "./team_stats.js";
import { drawIndividualModule }    from "./individual.js";
import { drawBatterVsBowlerTable } from "./BatterVsBowler.js";
import { drawPlayerVsPlayerTable } from "./PlayerVsPlayer.js";
import { drawTeamComparison }      from "./teamComparison.js";
import { drawTeamVsTeam }          from "./teamVsTeam.js";
import { drawWinPrediction }       from "./win_prediction.js";

const runners = [
  { sel: "#chart-top-batsmen",      fn: drawTopBatsmenChart },
  { sel: "#chart-top-bowlers",      fn: drawTopBowlersChart },
  { sel: "#chart-top-fielders",     fn: drawTopFieldersChart },
  { sel: "#chart-team-wins",        fn: drawTeamWinsChart },
  { sel: "#chart-wordcloud-mvp",    fn: drawWordCloud },
  { sel: "#chart-team-winners-pie", fn: drawTeamWinnersPie },
  { sel: "#chart-points-table",     fn: drawPointsTable },
  { sel: "#chart-team-stats",       fn: drawTeamStats },
  { sel: "#individual-module",      fn: drawIndividualModule },
  { sel: "#chart-batter-vs-bowler", fn: drawBatterVsBowlerTable },
  { sel: "#chart-player-vs-player", fn: drawPlayerVsPlayerTable },
  { sel: "#chart-team-comparison",  fn: drawTeamComparison },
  { sel: "#chart-team-vs-team",     fn: drawTeamVsTeam },
  { sel: "#chart-win-prediction",   fn: drawWinPrediction }
];

document.addEventListener("DOMContentLoaded", () => {
  for (const {sel, fn} of runners) {
    if (document.querySelector(sel)) {
      fn(sel);
    }
  }
});
