// frontend/js/wordcloud.js
export function drawWordCloud(containerSelector,
    apiEndpoint = "/api/wordcloud") {
const container = d3.select(containerSelector);
container.html("");

// Title
container.append("h2")
.text("Top 25 Most Valuable Players")
.style("margin-bottom", "10px");

// Controls: season filter
const ctrl = container.append("div")
.attr("class", "controls")
.style("display", "flex")
.style("gap", "10px")
.style("align-items", "center");

ctrl.append("label").text("Seasons:");
const yearSelect = ctrl.append("select")
.attr("multiple", true)
.attr("size", 5)
.style("width", "120px");

const years = Array.from({length: 2024 - 2008 + 1}, (_, i) => String(2008 + i));
const opts  = ["all", ...years];
yearSelect.selectAll("option")
.data(opts)
.join("option")
.attr("value", d => d)
.property("selected", d => d === "all")
.text(d => d);

const btn = ctrl.append("button").text("Reload");

// Chart area
const chartDiv = container.append("div")
.attr("class", "chart-area")
.style("position", "relative")
.style("width", "100%")
.style("height", "400px");

// tooltip
const tooltip = chartDiv.append("div")
.attr("class", "tooltip")
.style("display", "none");

// Fetch & render
btn.on("click", fetchAndRender);
fetchAndRender();

function fetchAndRender() {
const sel = Array.from(yearSelect.node().selectedOptions).map(o => o.value);
const yearsParam = sel.includes("all")
? "all"
: sel.filter(d => d !== "all").join(",");

chartDiv.html("<p>Loading…</p>");

d3.json(`${apiEndpoint}?years=${encodeURIComponent(yearsParam)}`)
.then(data => {
chartDiv.html("");  // clear
//  — guard against missing plugin —
if (!d3.layout || typeof d3.layout.cloud !== "function") {
chartDiv.append("p")
.style("color", "red")
.text("Word‑cloud plugin not loaded. Check your <script> includes.");
return;
}
render(data);
})
.catch(err => {
console.error(err);
chartDiv.html("<p style='color:red'>Failed to load word cloud.</p>");
});
}

function render(words) {
const width  = chartDiv.node().clientWidth;
const height = 400;

const layout = d3.layout.cloud()
.size([width, height])
.words(words.map(d => ({ text: d.text, size: d.size })))
.padding(5)
.rotate(0)
.fontSize(d => d.size * 0.5)
.on("end", draw);

layout.start();

function draw(placedWords) {
const svg = chartDiv.append("svg")
.attr("width",  width)
.attr("height", height)
.append("g")
.attr("transform", `translate(${width/2},${height/2})`);

svg.selectAll("text")
.data(placedWords)
.join("text")
.style("font-size", d => `${d.size}px`)
.style("fill", () => d3.schemeCategory10[Math.floor(Math.random()*10)])
.attr("text-anchor", "middle")
.attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
.text(d => d.text)
.on("mouseover", (event, d) => {
tooltip
.style("display","block")
.style("left",  event.layerX + 10 + "px")
.style("top",   event.layerY + 10 + "px")
.html(`<strong>${d.text}</strong><br/>Avg Pts: ${d.size.toFixed(1)}`);
})
.on("mouseout", () => tooltip.style("display","none"));
}
}
}
