// frontend/js/top_batsmen.js
import { makeFancyBars } from "./fancyBars.js";

export function drawTopBatsmenChart(
  containerSelector,
  apiEndpoint = "/api/top_batsmen"
) {
  const container = d3.select(containerSelector);
  container.html("");

  // chart wrapper that D3 will manage
  const chartArea = container.append("div").attr("class", "chart-area");

  // hook into the global season multi‑select (if present)
  const select = d3.select("#global-season-select");
  if (!select.empty()) {
    select.on("change", fetchAndRender);
  }

  // first paint
  fetchAndRender();

  // ────────────────────────────────────────────────────────────────
  function fetchAndRender() {
    // build ?years= param from the shared select
    let yearsParam = "all";
    if (!select.empty()) {
      const chosen = Array.from(select.node().selectedOptions).map((o) => o.value);
      yearsParam = chosen.includes("all")
        ? "all"
        : chosen.filter((y) => y !== "all").join(",");
    }

    chartArea.html("<p>Loading…</p>");
    d3.json(`${apiEndpoint}?years=${encodeURIComponent(yearsParam)}`)
      .then(renderChart)
      .catch((err) => {
        console.error("Error loading batsmen data:", err);
        chartArea.html("<p style='color:red'>Failed to load data; see console.</p>");
      });
  }

  // ────────────────────────────────────────────────────────────────
  function renderChart(data) {
    chartArea.selectAll("*").remove();

    const margin = { top: 40, right: 20, bottom: 100, left: 60 },
      width = 800 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

    const svg = chartArea
      .append("svg")
      .attr(
        "viewBox",
        `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`
      )
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // scales
    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.batter))
      .range([0, width])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.total_runs)])
      .nice()
      .range([height, 0]);

    // grid & axes
    svg
      .append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""));

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "10px");

    svg.append("g").call(d3.axisLeft(y));

    // tooltip (re‑used by hover events)
    const tooltip = chartArea
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("display", "none")
      .style("background", "rgba(0,0,0,0.7)")
      .style("color", "#fff")
      .style("padding", "6px")
      .style("border-radius", "4px")
      .style("font-size", "12px");

    // ── fancy bars + animation ────────────────────────────────
    makeFancyBars(svg); // inject <defs> once per SVG

    const bars = svg
      .selectAll(".bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.batter))
      .attr("y", height) // start flush with x‑axis
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .attr("fill", "url(#barGradient)")
      .attr("filter", "url(#barShadow)")
      .on("mouseover", (e, d) => {
        tooltip
          .style("display", "block")
          .style("left", `${e.layerX + 10}px`)
          .style("top", `${e.layerY + 10}px`)
          .html(`<strong>${d.batter}</strong><br/>Runs: ${d.total_runs}`);
      })
      .on("mouseout", () => tooltip.style("display", "none"));

    bars
      .transition()
      .duration(900)
      .ease(d3.easeCubicOut)
      .attr("y", (d) => y(d.total_runs))
      .attr("height", (d) => height - y(d.total_runs));

    // value labels
    svg
      .selectAll("text.value-label")
      .data(data)
      .join("text")
      .attr("class", "value-label")
      .attr("x", (d) => x(d.batter) + x.bandwidth() / 2)
      .attr("y", (d) => y(d.total_runs) - 8)
      .attr("text-anchor", "middle")
      .style("opacity", 0)
      .text((d) => d.total_runs)
      .transition()
      .delay(650)
      .style("opacity", 1);

    // axis labels
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 40)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Batsman");

    svg
      .append("text")
      .attr("x", -margin.left + 10)
      .attr("y", -10)
      .attr("text-anchor", "start")
      .style("font-size", "12px")
      .text("Total Runs");

    // title
    svg
      .append("text")
      .attr("class", "chart-title")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .text("Top 10 Batsmen by Total Runs");
  }
}
