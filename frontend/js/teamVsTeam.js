// frontend/js/teamVsTeam.js
import { createSeasonsDropdown } from "./seasonsDropdown.js";

export function drawTeamVsTeam(containerSelector,
    apiEndpoint = "/api/team_vs_team") {
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
  const nameToCode = teamsArr.reduce((map, t) => {
    map[t.name] = t.code;
    return map;
  }, {});

  container.append("h2")
    .text("Head-to-Head: MI vs RCB")
    .style("margin-bottom", "10px");

  // Controls
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

  const btn = ctrl.append("button").text("Load H2H");

  // Results table
  const resultArea = container.append("div")
    .attr("class", "chart-area")
    .style("margin-top", "20px");

  btn.on("click", async () => {
    const teamA = aInput.property("value").trim();
    const teamB = bInput.property("value").trim();
    const selectedYears = seasonsHelper.getSelectedSeasons();
    const yearsParam = selectedYears.includes("all")
      ? "all"
      : selectedYears.join(",");

    if (!teamA || !teamB) {
      resultArea.html("<p>Please enter both Team A and Team B.</p>");
      return;
    }
    resultArea.html("<p>Loading…</p>");

    try {
      const url = `${apiEndpoint}?teamA=${encodeURIComponent(teamA)}`
                + `&teamB=${encodeURIComponent(teamB)}`
                + `&years=${encodeURIComponent(yearsParam)}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        resultArea.html(`<p style="color:red">Server error ${resp.status}</p>`);
        return;
      }
      const data = await resp.json();
      if (data.error) {
        resultArea.html(`<p style="color:red">${data.error}</p>`);
      } else {
        renderTable(data);
      }
    } catch (err) {
      console.error(err);
      resultArea.html("<p style='color:red'>Network error; see console.</p>");
    }
  })
  // load defaults immediately
  .dispatch("click");

  function renderTable(d) {
    resultArea.html("");

    const codeA = nameToCode[d.teamA] || d.teamA;
    const codeB = nameToCode[d.teamB] || d.teamB;

    // header row
    const table = resultArea.append("table").attr("class", "stats-table");
    const thead = table.append("thead").append("tr");
    ["Type", "Total", `${codeA} Wins`, `${codeB} Wins`, "No Result"]
      .forEach(h =>
        thead.append("th").text(h)
          .style("padding", "6px 8px")
          .style("border-bottom", "2px solid #ccc")
      );

    // body
    const tbody = table.append("tbody");
    d.stats.forEach(r => {
      const tr = tbody.append("tr");
      tr.append("td").text(r.type);
      tr.append("td").text(r.matches);
      tr.append("td").text(r.winsA);
      tr.append("td").text(r.winsB);
      tr.append("td").text(r.no_result);
      tr.selectAll("td")
        .style("padding", "6px 8px")
        .style("border-bottom", "1px solid #eee");
    });
  }
}
