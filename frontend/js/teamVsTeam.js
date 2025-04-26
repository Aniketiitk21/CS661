// frontend/js/teamVsTeam.js
import { createSeasonsDropdown } from "./seasonsDropdown.js";
export function drawTeamVsTeam(containerSelector,
    apiEndpoint = "/api/team_vs_team") {
const container = d3.select(containerSelector);
container.html("");

container.append("h2")
.text("Head‑to‑Head: Team A vs Team B")
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
.style("flex", "1");

ctrl.append("label").text("Team B:");
const bInput = ctrl.append("input")
.attr("type", "text")
.attr("placeholder", "e.g. Chennai Super Kings")
.style("flex", "1");

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
resultArea.html("<p>Please enter both Team A and Team B.</p>");
return;
}
resultArea.html("<p>Loading…</p>");

try {
const url = `${apiEndpoint}?teamA=${encodeURIComponent(teamA)}` +
`&teamB=${encodeURIComponent(teamB)}` +
`&years=${encodeURIComponent(yearsParam)}`;
const resp = await fetch(url);
if (!resp.ok) {
const txt = await resp.text();
console.error(`Error ${resp.status}:`, txt);
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
});

function renderTable(d) {
resultArea.html("");

// header row
const table = resultArea.append("table").attr("class", "stats-table");
const thead = table.append("thead").append("tr");
["Type", "Total", `${d.teamA} Wins`, `${d.teamB} Wins`, "No Result"]
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
