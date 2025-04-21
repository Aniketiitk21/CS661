// frontend/js/team_stats.js
export function drawTeamStats(containerSelector,
    apiEndpoint = "/api/team_stats") {
const container = d3.select(containerSelector);
container.html("");

// Title
container.append("h2")
.text("Team Season Stats")
.style("margin-bottom", "10px");

// Controls
const ctrl = container.append("div")
.attr("class","controls")
.style("display","flex")
.style("gap","10px")
.style("align-items","center");

ctrl.append("label").text("Team:");
const teamInput = ctrl.append("input")
.attr("type","text")
.attr("placeholder","e.g. Mumbai Indians")
.style("flex","1");

ctrl.append("label").text("Seasons:");
const yearSelect = ctrl.append("select")
.attr("multiple", true)
.attr("size", 5)
.style("width", "100px");

const years = Array.from({length:2024-2008+1}, (_,i) => String(2008+i));
const opts  = ["all", ...years];
yearSelect.selectAll("option")
.data(opts)
.join("option")
.attr("value", d => d)
.property("selected", d => d === "all")
.text(d => d);

const btn = ctrl.append("button").text("Show Stats");

const resultArea = container.append("div")
.attr("class","chart-area")
.style("margin-top","20px");

btn.on("click", async () => {
const team = teamInput.property("value").trim();
const sel  = Array.from(yearSelect.node().selectedOptions).map(o=>o.value);
const yearsParam = sel.includes("all")
? "all"
: sel.filter(d=>d!=="all").join(",");

if (!team) {
resultArea.html("<p>Please enter a team.</p>");
return;
}
resultArea.html("<p>Loading…</p>");

try {
const resp = await fetch(
`${apiEndpoint}?team=${encodeURIComponent(team)}&years=${encodeURIComponent(yearsParam)}`
);
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
renderTable(data.stats);
}
} catch (err) {
console.error("Fetch failed:", err);
resultArea.html("<p style='color:red'>Network error; see console.</p>");
}
});

// initial draw
btn.dispatch("click");

function renderTable(rows) {
resultArea.html("");
const table = resultArea.append("table")
.attr("class","stats-table");

// header
const thead = table.append("thead").append("tr");
["Type","Pld","W","L","NR"].forEach(h =>
thead.append("th")
.text(h)
.style("padding","6px 8px")
.style("border-bottom","2px solid #ccc")
);

// body
const tbody = table.append("tbody");
rows.forEach(r => {
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
