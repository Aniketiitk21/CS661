// js/main.js
import { drawTopBatsmenChart }    from "./top_batsmen.js";
import { drawTopBowlersChart }    from "./top_bowlers.js";
import { drawTopFieldersChart }   from "./top_fielders.js";
import { drawTeamWinsChart }      from "./team_wins.js";
import { drawIndividualModule }   from "./individual.js";
import { drawBatterVsBowlerTable } from "./BatterVsBowler.js";
import { drawPlayerVsPlayerTable } from "./PlayerVsPlayer.js";
import { drawTeamWinnersPie }   from "./winners.js";
import { drawPointsTable }        from "./pointsTable.js";
import { drawTeamStats } from "./team_stats.js";
import { drawTeamComparison } from "./teamComparison.js";
import { drawTeamVsTeam } from "./teamVsTeam.js";
import { drawWordCloud } from "./wordcloud.js";
import { drawWinPrediction } from "./win_prediction.js";


document.addEventListener("DOMContentLoaded", () => {
  // 1) draw all the “global” charts first:
  drawTopBatsmenChart("#chart-top-batsmen");
  drawTopBowlersChart ("#chart-top-bowlers");
  drawTopFieldersChart("#chart-top-fielders");
  drawTeamWinsChart   ("#chart-team-wins");
  drawTeamWinnersPie("#chart-team-winners-pie");
  drawBatterVsBowlerTable("#chart-batter-vs-bowler");
  drawPlayerVsPlayerTable("#chart-player-vs-player");
  drawPointsTable     ("#chart-points-table");
  drawTeamStats("#chart-team-stats");
  drawTeamComparison("#chart-team-comparison");
  drawTeamVsTeam("#chart-team-vs-team");
  drawIndividualModule();
  drawWordCloud("#chart-wordcloud-mvp");
  drawWinPrediction("#chart-win-prediction");
});
