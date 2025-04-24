// frontend/js/team_wins.js

export function drawTeamWinsChart(containerSelector,
  apiEndpoint = "/api/team_wins") {

  const container = d3.select(containerSelector);
  container.html("");  // clear any old content

  // 1) Title
  container.append("h2")
    .text("Team Wins by Season(s)")
    .style("margin-bottom", "10px");

  // 2) Chart area (for both SVG + tooltip)
  const chartArea = container.append("div")
    .attr("class", "chart-area")
    .style("position", "relative");

  const tooltip = chartArea.append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("display", "none")
    .style("padding", "6px")
    .style("background", "rgba(0,0,0,0.7)")
    .style("color", "#fff")
    .style("border-radius", "4px")
    .style("font-size", "12px");

  // 3) Grab the global season selector
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
    // compute yearsParam from the shared select
    let yearsParam = "all";
    if (!select.empty()) {
      const chosen = Array.from(select.node().selectedOptions)
        .map(o => o.value);
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

  // 6) Draw the bar chart
  function renderChart(raw) {
    chartArea.selectAll("*").remove();

    if (!raw.length) {
      return chartArea.append("p").text("No data for these seasons.");
    }

    // remap { count, wins } → { team, wins }
    const data = raw.map(d => ({
      team: d.wins,
      wins: +d.count
    }));

    const margin = { top: 40, right: 20, bottom: 100, left: 60 };
    const width  = 800 - margin.left - margin.right;
    const height = 500 - margin.top  - margin.bottom;

    const svg = chartArea.append("svg")
      .attr("viewBox", `0 0 ${width+margin.left+margin.right} ${height+margin.top+margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X axis
    const x = d3.scaleBand()
      .domain(data.map(d => d.team))
      .range([0, width])
      .padding(0.2);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
        .attr("transform","rotate(-45)")
        .style("text-anchor","end")
        .style("font-size","10px");

    // Y axis
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.wins)])
      .nice()
      .range([height, 0]);

    svg.append("g")
      .call(d3.axisLeft(y));

    // gridlines
    svg.append("g")
      .attr("class","grid")
      .call(
        d3.axisLeft(y)
          .ticks(5)
          .tickSize(-width)
          .tickFormat("")
      );

    // bars
    const bw = x.bandwidth();
    svg.selectAll(".bar")
      .data(data)
      .join("rect")
        .attr("class","bar")
        .attr("x",      d => x(d.team))
        .attr("y",      d => y(d.wins))
        .attr("width",  bw)
        .attr("height", d => height - y(d.wins))
        .attr("fill","#2ca02c")
        .on("mouseover", (e,d) => {
          tooltip
            .style("display","block")
            .style("left",  `${e.layerX+10}px`)
            .style("top",   `${e.layerY+10}px`)
            .html(`<strong>${d.team}</strong><br/>Wins: ${d.wins}`);
        })
        .on("mouseout", () => tooltip.style("display","none"));

    // labels
    svg.selectAll(".bar-label")
      .data(data)
      .join("text")
        .attr("class","bar-label")
        .attr("x", d => x(d.team) + bw/2)
        .attr("y", d => y(d.wins) - 5)
        .attr("text-anchor","middle")
        .style("font-size","10px")
        .style("fill","#333")
        .text(d => d.wins);

    // X & Y axis labels
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 40)
      .attr("text-anchor","middle")
      .style("font-size","12px")
      .text("Team");

    svg.append("text")
      .attr("x", -margin.left + 10)
      .attr("y", -10)
      .attr("text-anchor","start")
      .style("font-size","12px")
      .text("Number of Wins");
  }
}
