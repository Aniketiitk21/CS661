// frontend/js/pointsTable.js
export function drawPointsTable(containerSelector,
    apiEndpoint = "/api/points_table") {
const container = d3.select(containerSelector);
container.html("");

// Title
container.append("h2")
.text("Season Points Table")
.style("margin-bottom", "10px");

// Controls: choose a single season
const ctrl = container.append("div")
.attr("class", "controls")
.style("display", "flex")
.style("gap", "10px")
.style("align-items", "center");

ctrl.append("label")
.attr("for", "points-year-select")
.text("Season:");

const select = ctrl.append("select")
.attr("id", "points-year-select")
.style("font-size", "0.9rem")
.style("padding", "6px 8px");

// fill years 2008–2024
const years = Array.from({ length: 2024 - 2008 + 1 }, (_, i) => String(2008 + i));
select.selectAll("option")
.data(years)
.join("option")
.attr("value", d => d)
.text(d => d);

// default to latest
select.property("value", years[years.length - 1]);

const btn = ctrl.append("button")
.text("Show Table");

// Results area
const resultArea = container.append("div")
.attr("class", "chart-area")
.style("margin-top", "20px");

// Fetch & render
async function fetchAndRender() {
const year = select.property("value");
resultArea.html("<p>Loading…</p>");
try {
const resp = await fetch(`${apiEndpoint}?year=${encodeURIComponent(year)}`);
const data = await resp.json();
if (data.error) {
resultArea.html(`<p style="color:red">${data.error}</p>`);
} else {
renderTable(data);
}
} catch (err) {
console.error(err);
resultArea.html("<p>Request failed; see console.</p>");
}
}
btn.on("click", fetchAndRender);
// initial draw
fetchAndRender();

// Table renderer
function renderTable(rows) {
resultArea.html("");
if (!rows.length) {
resultArea.append("p").text("No data for this season.");
return;
}

const table = resultArea.append("table")
.attr("class", "stats-table");

// header
const thead = table.append("thead").append("tr");
["Team", "Pld", "W", "L", "NR", "Pts", "NRR"].forEach(h =>
thead.append("th")
.text(h)
.style("padding", "6px 8px")
.style("border-bottom", "2px solid #ccc")
);

// body
const tbody = table.append("tbody");
rows.forEach(r => {
const tr = tbody.append("tr");
tr.append("td").text(r.team);
tr.append("td").text(r.matches_played);
tr.append("td").text(r.wins);
tr.append("td").text(r.losses);
tr.append("td").text(r.no_result);
tr.append("td").text(r.points);
tr.append("td").text(r.nrr.toFixed(3));
tr.selectAll("td")
.style("padding", "6px 8px")
.style("border-bottom", "1px solid #eee");
});
}
}
