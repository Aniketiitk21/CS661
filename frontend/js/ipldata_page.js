// static/js/ipldata_page.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { createSeasonsDropdown } from "./seasonsDropdown.js";
import {
  drawTopBatsmen,
  drawTopBowlers,
  drawTopFielders,
  drawWordCloud,
  drawWinnersPie,
  drawTeamWins
} from "./ipldata.js";

export function wireIpldataPage() {
  // render filters
  const ctrl = d3.select("#global-controls");
  const seasonsHelper = createSeasonsDropdown(ctrl);

  ctrl
    .append("button")
    .attr("id", "global-apply-btn")
    .classed("btn btn-primary btn-sm", true)
    .text("Apply")
    .on("click", () => {
      const yrs = seasonsHelper.getSelectedSeasons().join(",");
      drawTopBatsmen("#chart-top-batsmen", yrs);
      drawTopBowlers("#chart-top-bowlers", yrs);
      drawTopFielders("#chart-top-fielders", yrs);
      drawWordCloud("#chart-wordcloud-mvp", yrs);
      drawWinnersPie("#chart-team-winners-pie", yrs);
      drawTeamWins("#chart-team-wins", yrs);
    });

  // initial draw
  d3.select("#global-apply-btn").dispatch("click");
}
