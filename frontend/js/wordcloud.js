// frontend/js/wordcloud.js

export function drawWordCloud(containerSelector,
  apiEndpoint = "/data/wordcloud.json") {
const container = d3.select(containerSelector)
.attr("class", "wordcloud-container")
.style("position", "relative")
.style("overflow", "hidden");
container.html("");

container.append("h4")
.attr("class", "wordcloud-title")
.text("🌟 Most Valuable Players")
.style("text-align", "center")
.style("margin-bottom", "15px");

const chartArea = container.append("div")
.attr("class", "chart-area wordcloud-chart-area")
.style("position", "relative")
.style("width", "100%")
.style("height", "350px")
.style("overflow", "hidden");

const tooltip = container.append("div")
.attr("class", "tooltip wordcloud-tooltip")
.style("position", "absolute")
.style("pointer-events", "none")
.style("opacity", 0)
.style("transition", "opacity 0.2s, left 0.1s, top 0.1s")
.style("padding", "4px 8px")
.style("background", "rgba(0,0,0,0.8)")
.style("color", "#fff")
.style("border-radius", "4px")
.style("font-size", "13px")
.style("white-space", "nowrap")
.style("z-index", "10");

const select = d3.select("#global-season-select");
if (!select.empty()) {
select.on("change.wordcloud", fetchAndRender);
}

fetchAndRender();

async function fetchAndRender() {
let yearsParam = "all";
if (!select.empty()) {
const chosen = Array.from(select.node().selectedOptions).map(o => o.value);
yearsParam = chosen.includes("all") || chosen.length === 0
? "all"
: chosen.filter(y => y !== "all").join(",");
}

chartArea.html("<p style='text-align:center;padding:2rem'>Loading Player Cloud…</p>");
tooltip.style("opacity", 0);

try {
const resp = await fetch(`${apiEndpoint}?years=${encodeURIComponent(yearsParam)}`);
const text = await resp.text();
let data;
try { data = JSON.parse(text); }
catch {
chartArea.html(`<p style="color:red;text-align:center">Server returned invalid data.</p>`);
return;
}
if (!resp.ok || data.error) {
chartArea.html(`<p style="color:red;text-align:center">
Error ${resp.status}: ${data?.error||resp.statusText}
</p>`);
return;
}
if (!d3.layout || typeof d3.layout.cloud !== "function") {
chartArea.html(`<p style="color:red;text-align:center">
Word Cloud library not loaded.
</p>`);
return;
}
chartArea.selectAll("*").remove();
if (!data.length) {
chartArea.html(`<p style="text-align:center;color:#666;padding:2rem">
No data found.
</p>`);
return;
}
render(data);
} catch (err) {
console.error(err);
chartArea.html(`<p style="color:red;text-align:center">
Network error fetching word cloud.
</p>`);
}
}

function render(words) {
const node = chartArea.node();
if (!node) return;
const width  = node.clientWidth;
const height = node.clientHeight;
if (width <= 0 || height <= 0) {
chartArea.html(`<p style="color:orange;text-align:center">
Invalid container dimensions.
</p>`);
return;
}

// raw sizes e.g. [90 .. 150]
const rawExtent = d3.extent(words, d => +d.size);
const minRaw = rawExtent[0], maxRaw = rawExtent[1];

// map raw [minRaw..maxRaw] → [12px..Math.min(60, height/4)]
const minPx = 17;
const maxPx = Math.min(60, height / 6);
const sizeScale = d3.scaleLinear()
.domain(minRaw === maxRaw ? [minRaw*0.9, maxRaw*1.1] : [minRaw, maxRaw])
.range([minPx, maxPx])
.clamp(true);

const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

d3.layout.cloud()
.size([width, height])
.words(words.map(d => ({ text: d.text, size: +d.size })))
.padding(3)
.spiral("archimedean")
.rotate(() => (Math.random()<0.7?0:90))
.font("Impact, Arial Black, sans-serif")
.fontSize(d => sizeScale(d.size))
.on("end", draw)
.start();

function draw(placedWords) {
if (!chartArea.node()) return;
const svg = chartArea.append("svg")
.attr("width", width)
.attr("height", height)
.style("overflow", "hidden")
.attr("class", "wordcloud-svg")
.append("g")
.attr("transform", `translate(${width/2},${height/2})`);

const texts = svg.selectAll("text")
.data(placedWords)
.join("text")
.attr("class", "wtext")
.style("font-family", "Impact, Arial Black, sans-serif")
.style("font-size", "1px")
.style("fill-opacity", 0)
.attr("text-anchor", "middle")
.attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
.style("fill", (d,i) => colorScale(i))
.style("cursor", "default")
.text(d => d.text);

texts.transition()
.duration(750)
.delay((d,i) => i*5)
.style("font-size", d => `${d.size}px`)
.style("fill-opacity", 1);

texts
.on("mouseover.tooltip", (evt,d) => {
// compute ratio of this word’s size to maxRaw
const ratio = (d.size / maxRaw).toFixed(2);
tooltip
.style("opacity", 1)
.style("left", `${evt.pageX - container.node().getBoundingClientRect().left + 10}px`)
.style("top",  `${evt.pageY - container.node().getBoundingClientRect().top + 10}px`)
.html(`
<strong>${d.text}</strong><br/>
Score: ${d.size.toFixed(2)}<br/>
Ratio: ${ratio}×
`);
d3.select(evt.currentTarget)
.transition().duration(100)
.style("font-weight", "bold");
})
.on("mousemove.tooltip", (evt) => {
tooltip
.style("left", `${evt.pageX - container.node().getBoundingClientRect().left + 10}px`)
.style("top",  `${evt.pageY - container.node().getBoundingClientRect().top + 10}px`);
})
.on("mouseout.tooltip", (evt) => {
tooltip.style("opacity", 0);
d3.select(evt.currentTarget)
.transition().duration(100)
.style("font-weight", "normal");
});
}
}
}
