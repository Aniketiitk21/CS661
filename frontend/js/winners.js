// frontend/js/winners.js
export function drawTeamWinnersPie(containerSelector,
    apiEndpoint = "/api/team_winners") {
const container = d3.select(containerSelector);
container.html("");

// Title
container.append("h2")
.text("All‑Time IPL Champions")
.style("margin-bottom", "10px");

const chartArea = container.append("div")
.attr("class", "chart-area")
.style("position", "relative");  // for tooltip positioning

// Tooltip
const tooltip = chartArea.append("div")
.attr("class", "tooltip")
.style("position", "absolute")
.style("pointer-events", "none")
.style("padding", "6px")
.style("background", "rgba(0,0,0,0.7)")
.style("color", "#fff")
.style("border-radius", "4px")
.style("font-size", "12px")
.style("display", "none");

// Fetch & draw
d3.json(`${apiEndpoint}?years=all`)
.then(data => {
if (!data.length) {
chartArea.append("p").text("No data available.");
return;
}

const width  = 400,
height = 400,
radius = Math.min(width, height) / 2;

const svg = chartArea.append("svg")
.attr("viewBox", `0 0 ${width} ${height}`)
.append("g")
.attr("transform", `translate(${width/2},${height/2})`);

const color = d3.scaleOrdinal(d3.schemeCategory10)
.domain(data.map(d => d.team));

const pie = d3.pie()
.value(d => d.titles)
.sort(null);

const arc = d3.arc()
.innerRadius(0)
.outerRadius(radius - 10);

const arcs = svg.selectAll("arc")
.data(pie(data))
.join("g")
.attr("class", "arc");

// slices
arcs.append("path")
.attr("d", arc)
.attr("fill", d => color(d.data.team))
.on("mouseover", (event, d) => {
tooltip
.style("display", "block")
.html(
`<strong>${d.data.team}</strong><br/>
Titles: ${d.data.titles}<br/>
Seasons: ${d.data.seasons.join(", ")}`
);
})
.on("mousemove", (event) => {
tooltip
.style("left", (event.layerX + 10) + "px")
.style("top",  (event.layerY + 10) + "px");
})
.on("mouseout", () => {
tooltip.style("display", "none");
});

// labels
arcs.append("text")
.attr("transform", d => `translate(${arc.centroid(d)})`)
.attr("text-anchor", "middle")
.style("font-size", "10px")
.text(d => d.data.titles);
})
.catch(err => {
console.error("Error loading winners data:", err);
chartArea.html("<p>Failed to load data; see console.</p>");
});
}
