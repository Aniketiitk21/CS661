// frontend/js/team_wins.js

export function drawTeamWinsChart(containerSelector,
  apiEndpoint = "/api/team_wins") {

  const container = d3.select(containerSelector);
  container.html("");  // clear any old content

  // 1) Title
  container.append("h2")
    .text("Team Wins by Season(s)")
    .style("margin-bottom", "10px");

  // 2) Chart area (for SVG + tooltip)
  const chartArea = container.append("div")
    .attr("class", "chart-area")
    .style("position", "relative")
    .style("width", "100%")       // let CSS or parent container control actual width
    .style("max-width", "2400px") // optional max-width
    .style("margin", "0 auto");

  const tooltip = chartArea.append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("display", "none")
    .style("padding", "6px")
    .style("background", "rgba(0,0,0,0.7)")
    .style("color", "#fff")
    .style("border-radius", "2px")
    .style("font-size", "12px");

  // 3) Global seasons selector
  const select = d3.select("#global-season-select");
  if (select.empty()) {
    console.warn("⚠️  #global-season-select not found; defaulting to all seasons");
  } else {
    select.on("change", fetchAndRender);
  }

  // 4) Initial draw
  fetchAndRender();

  // 5) Fetch & render
  function fetchAndRender() {
    let yearsParam = "all";
    if (!select.empty()) {
      const chosen = Array.from(select.node().selectedOptions).map(o => o.value);
      yearsParam = chosen.includes("all")
        ? "all"
        : chosen.filter(y => y !== "all").join(",");
    }

    chartArea.html("<p>Loading…</p>");
    tooltip.style("display", "none");

    d3.json(`${apiEndpoint}?years=${encodeURIComponent(yearsParam)}`)
      .then(data => renderChart(data))
      .catch(err => {
        console.error("Error loading team wins:", err);
        chartArea.html("<p style='color:red'>Failed to load data; see console.</p>");
      });
  }

  // 6) Draw horizontal bar chart
  function renderChart(raw) {
    chartArea.selectAll("*").remove();

    if (!raw.length) {
      chartArea.append("p").text("No data for these seasons.");
      return;
    }

    // map API fields { wins: teamName, count: wins }
    const data = raw.map(d => ({
      team: d.wins,
      wins: +d.count
    }));

    const margin = { top: 40, right: 20, bottom: 60, left: 140 };
    // dynamic width from container
    const fullWidth = chartArea.node().clientWidth;
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = chartArea.append("svg")
      .attr("viewBox", `0 0 ${fullWidth} 500`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // drop-shadow filter
    const defs = svg.append("defs");
    const filter = defs.append("filter")
        .attr("id", "dropShadow")
        .attr("height", "130%");
    filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 2)
        .attr("result", "blur");
    filter.append("feOffset")
        .attr("in", "blur")
        .attr("dx", 1)
        .attr("dy", 1)
        .attr("result", "offsetBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "offsetBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // scales
    const y = d3.scaleBand()
      .domain(data.map(d => d.team))
      .range([0, height])
      .padding(0.2);

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.wins)]).nice()
      .range([0, width]);

    // axes

// 2) axes
const yAxis = svg.append("g").call(d3.axisLeft(y).tickSize(0));
yAxis.select(".domain").remove();
const xAxis = svg.append("g")
  .attr("transform",`translate(0,${height})`)
  .call(d3.axisBottom(x).ticks(5).tickSize(0));
  xAxis.select(".domain").remove();
// 2a) style them
yAxis.selectAll("text")
.style("fill","#1f4f82")
.style("font-size","12px")
.style("font-weight","600");
xAxis.selectAll("text")
.style("fill","#1f4f82")
.style("font-size","0px");
svg.selectAll(".domain, .tick line")
.attr("stroke","#aaa").attr("stroke-width",1);

    // bars (initial width 0 for animation)
    const bars = svg.selectAll(".bar")
      .data(data)
      .join("rect")
        .attr("class", "bar")
        .attr("y", d => y(d.team))
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("fill", "#2ca02c")
        .attr("width", 0); 

    // animate bars in
    bars.transition()
      .delay((d,i) => i * 50)
      .duration(800)
      .attr("width", d => x(d.wins));

    // hover interactions
    bars.on("mouseover", (e, d) => {
        d3.select(e.currentTarget)
          .transition().duration(200)
          .attr("fill", "#28a745")
        tooltip
          .style("display", "block")
          .style("left", `${e.pageX + 10}px`)
          .style("top", `${e.pageY + 10}px`)
          .html(`<strong>${d.team}</strong><br/>Wins: ${d.wins}`);
      })
      .on("mouseout", (e) => {
        d3.select(e.currentTarget)
          .transition().duration(200)
          .attr("fill", "#2ca02c")
        tooltip.style("display", "none");
      });

    // bar labels
    svg.selectAll(".bar-label")
      .data(data)
      .join("text")
        .attr("class", "bar-label")
        .attr("y", d => y(d.team) + y.bandwidth() / 2)
        .attr("x", d => x(d.wins) + 6)
        .attr("dy", "0.35em")
        .style("font-size", "10px")
        .text(d => d.wins);

    // axis labels
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "25px")
      .text("Number of Wins");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 20)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
     
  }
}
