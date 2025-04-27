// frontend/js/teamComparison.js
import { createSeasonsDropdown } from "./seasonsDropdown.js";

export function drawTeamComparison(containerSelector,
    apiEndpoint = "/api/team_stats_compare") {
  const container = d3.select(containerSelector);
  container.html("");

  // mapping full names to short codes
  const teamsArr = [
    { code: "MI",   name: "Mumbai Indians" },
    { code: "CSK",  name: "Chennai Super Kings" },
    { code: "RCB",  name: "Royal Challengers Bengaluru" },
    { code: "KKR",  name: "Kolkata Knight Riders" },
    { code: "SRH",  name: "Sunrisers Hyderabad" },
    { code: "DC",   name: "Delhi Capitals" },
    { code: "PBKS", name: "Punjab Kings" },
    { code: "RR",   name: "Rajasthan Royals" },
    { code: "LSG",  name: "Lucknow Super Giants" },
    { code: "GT",   name: "Gujarat Titans" },
    { code: "GL",   name: "Gujarat Lions" },
    { code: "DECC", name: "Deccan Chargers" },
    { code: "KTK",  name: "Kochi Tuskers Kerala" },
    { code: "RPS",  name: "Rising Pune Supergiants" },
    { code: "PW",   name: "Pune Warriors" }
  ];
  const nameToCode = teamsArr.reduce((acc, t) => {
    acc[t.name] = t.code;
    return acc;
  }, {});

  // 1) Title
  container.append("h2")
    .text("Team vs Team Comparison")
    .style("margin-bottom", "10px");

  // 2) Controls
  const ctrl = container.append("div")
    .attr("class", "controls")
    .style("display", "flex")
    .style("gap", "10px")
    .style("flex-wrap", "wrap")
    .style("align-items", "center");

  ctrl.append("label").text("Team A:");
  const aInput = ctrl.append("input")
    .attr("type", "text")
    .attr("placeholder", "e.g. Mumbai Indians")
    .style("flex", "1")
    .property("value", "Mumbai Indians");

  ctrl.append("label").text("Team B:");
  const bInput = ctrl.append("input")
    .attr("type", "text")
    .attr("placeholder", "e.g. Chennai Super Kings")
    .style("flex", "1")
    .property("value", "Royal Challengers Bengaluru");

  const seasonsHelper = createSeasonsDropdown(ctrl);
  const btn = ctrl.append("button").text("Compare");

  // 3) Results wrapper
  const results = container.append("div")
    .attr("class", "stats-comparison")
    .style("display", "flex")
    .style("gap", "20px")
    .style("margin-top", "20px");

  const areaA = results.append("div").attr("class", "chart-area");
  const areaB = results.append("div").attr("class", "chart-area");

  // 4) Fetch & render
  btn.on("click", async () => {
    const teamA = aInput.property("value").trim();
    const teamB = bInput.property("value").trim();
    const selectedYears = seasonsHelper.getSelectedSeasons();
    const yearsParam = selectedYears.includes("all")
      ? "all"
      : selectedYears.join(",");

    if (!teamA || !teamB) {
      areaA.html("<p>Please enter both teams.</p>");
      areaB.html("");
      return;
    }

    areaA.html("<p>Loading…</p>");
    areaB.html("<p>Loading…</p>");

    try {
      const url = `${apiEndpoint}`
        + `?teamA=${encodeURIComponent(teamA)}`
        + `&teamB=${encodeURIComponent(teamB)}`
        + `&years=${encodeURIComponent(yearsParam)}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        areaA.html(`<p style="color:red">Server error ${resp.status}</p>`);
        areaB.html("");
        return;
      }
      const data = await resp.json();
      if (data.error) {
        areaA.html(`<p style="color:red">${data.error}</p>`);
        areaB.html("");
      } else {
        renderTable(areaA, data.teamA);
        renderTable(areaB, data.teamB);
      }
    } catch (err) {
      console.error(err);
      areaA.html("<p style='color:red'>Network error; see console.</p>");
      areaB.html("");
    }
  })
  // default on load
  .dispatch("click");

  // 5) Table renderer
  function renderTable(area, payload) {
    area.html("");
    // use short code if available
    const code = nameToCode[payload.team] || payload.team;
    area.append("h3")
      .text(code)
      .style("margin-bottom", "8px");

    const table = area.append("table")
      .attr("class", "stats-table");
    const thead = table.append("thead").append("tr");
    ["Type","Pld","W","L","NR"].forEach(h =>
      thead.append("th").text(h)
        .style("padding","6px 8px")
        .style("border-bottom","2px solid #ccc")
    );

    const tbody = table.append("tbody");
    payload.stats.forEach(r => {
      const tr = tbody.append("tr");
      tr.append("td").text(r.type);
      tr.append("td").text(r.matches_played);
      tr.append("td").text(r.wins);
      tr.append("td").text(r.losses);
      tr.append("td").text(r.no_result);
      tr.selectAll("td")
        .style("padding","6px 8px")
        .style("border-bottom","1px solid #eee");
    });
  }
}
