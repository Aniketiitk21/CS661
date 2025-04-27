// frontend/js/top_fielders.js
import { makeFancyBars } from "./fancyBars.js";

export function drawTopFieldersChart(
  containerSelector,
  apiEndpoint = "/api/top_fielders"
) {
  const container = d3.select(containerSelector).html("");
  const chartArea = container.append("div").attr("class", "chart-area");

  const select = d3.select("#global-season-select");
  if (!select.empty()) select.on("change", fetchAndRender);

  fetchAndRender();

  function fetchAndRender() {
    let yearsParam = "all";
    if (!select.empty()) {
      const chosen = Array.from(select.node().selectedOptions).map(o => o.value);
      yearsParam = chosen.includes("all")
        ? "all"
        : chosen.filter(y => y !== "all").join(",");
    }

    chartArea.html("<p>Loading…</p>");
    d3.json(`${apiEndpoint}?years=${encodeURIComponent(yearsParam)}`)
      .then(renderChart)
      .catch(err => {
        console.error(err);
        chartArea.html("<p style='color:red'>Failed to load data.</p>");
      });
  }

  function renderChart(data) {
    chartArea.selectAll("*").remove();
    if (!data.length) return chartArea.append("p").text("No data.");

    const margin = { top: 40, right: 20, bottom: 100, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = chartArea
      .append("svg")
      .attr(
        "viewBox",
        `0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`
      )
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand()
      .domain(data.map(d => d.fielder))
      .range([0, width])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, d => d.fielding_attempts)])
      .nice()
      .range([height, 0]);

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

    const tooltip = chartArea
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("display", "none");

    svg
      .selectAll(".bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.fielder))
      .attr("y", d => y(d.fielding_attempts))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.fielding_attempts))
      .attr("fill", "#2E8B57")
      .on("mouseover", (e, d) => {
        tooltip
          .style("display", "block")
          .style("left", e.layerX + 10 + "px")
          .style("top", e.layerY + 10 + "px")
          .html(
            `<strong>${d.fielder}</strong><br/>Attempts ${d.fielding_attempts}`
          );
      })
      .on("mouseout", () => tooltip.style("display", "none"));

    svg
      .selectAll(".bar-label")
      .data(data)
      .join("text")
      .attr("class", "bar-label")
      .attr("x", d => x(d.fielder) + x.bandwidth() / 2)
      .attr("y", d => y(d.fielding_attempts) - 5)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .text(d => d.fielding_attempts);

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 40)
      .attr("text-anchor", "middle")
      .text("Fielder");
    svg
      .append("text")
      .attr("x", -margin.left + 10)
      .attr("y", -10)
      .attr("text-anchor", "start")
      .text("Fielding Attempts");
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text("Top 10 Fielders by Attempts");

    /* 🎨 fancy bars */
    makeFancyBars(svg);
  }
}
