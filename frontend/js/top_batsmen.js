// top_batsmen.js
export function drawTopBatsmenChart(containerSelector, apiEndpoint = "/api/top_batsmen") {
    const container = d3.select(containerSelector);
    container.html("");  // clear previous
  
    //
    // 1) CONTROLS + CHART WRAPPER
    //
    // we’ll make this flex‑row: controls on left, chart on right
    const wrapper = container
      .append("div")
      .attr("class", "batsmen-wrapper");
  
    // controls panel
    const controls = wrapper
      .append("div")
      .attr("class", "controls");
  
    controls.append("label")
      .attr("for", "season-select")
      .text("Seasons:");
  
    const select = controls.append("select")
      .attr("id", "season-select")
      .attr("multiple", true)
      .attr("size", 6);           // show 6 rows at once
  
    // options
    const years = Array.from({ length: 2024 - 2008 + 1 }, (_, i) => String(2008 + i));
    const opts  = ["all", ...years];
    select.selectAll("option")
      .data(opts)
      .join("option")
        .attr("value", d => d)
        .property("selected", d => d === "all")
        .text(d => d);
  
    // chart area
    const chartArea = wrapper
      .append("div")
      .attr("class", "chart-area");
  
    //
    // 2) FETCH & RENDER
    //
    function fetchAndRender() {
      const chosen = Array.from(select.node().selectedOptions).map(o => o.value);
      const yearsParam = chosen.includes("all")
        ? "all"
        : chosen.filter(d => d !== "all").join(",");
  
      d3.json(`${apiEndpoint}?years=${yearsParam}`)
        .then(data => renderChart(data))
        .catch(err => {
          console.error("Error loading batsmen data:", err);
          chartArea.html("<p>Failed to load data; see console</p>");
        });
    }
  
    //
    // 3) DRAW THE CHART
    //
    function renderChart(data) {
      chartArea.selectAll("*").remove();
  
      // margins -> larger bottom for rotated labels
      const margin = { top: 40, right: 20, bottom: 100, left: 60 };
      const width  = 800 - margin.left - margin.right;
      const height = 500 - margin.top  - margin.bottom;
  
      // responsive svg
      const svg = chartArea.append("svg")
          .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
          .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);
  
      // scales
      const x = d3.scaleBand()
        .domain(data.map(d => d.batter))
        .range([0, width])
        .padding(0.2);
  
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.total_runs)])
        .nice()
        .range([height, 0]);
  
      // gridlines
      svg.append("g")
        .attr("class", "grid")
        .call(
          d3.axisLeft(y)
            .ticks(5)
            .tickSize(-width)
            .tickFormat("")
        );
  
      // axes
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
          .attr("transform", "rotate(-45)")
          .style("text-anchor", "end")
          .style("font-size", "10px");
  
      svg.append("g")
        .call(d3.axisLeft(y));
  
      // bars
      svg.selectAll(".bar")
        .data(data)
        .join("rect")
          .attr("class", "bar")
          .attr("x",      d => x(d.batter))
          .attr("y",      d => y(d.total_runs))
          .attr("width",  x.bandwidth())
          .attr("height", d => height - y(d.total_runs))
          .attr("fill",   "#4C79A7");
  
      // labels above bars
      svg.selectAll(".bar-label")
        .data(data)
        .join("text")
          .attr("class", "bar-label")
          .attr("x", d => x(d.batter) + x.bandwidth() / 2)
          .attr("y", d => y(d.total_runs) - 5)
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .style("fill", "#333")
          .text(d => d.total_runs);
  
      // title
      svg.append("text")
         .attr("x", width / 2)
         .attr("y", -10)
         .attr("text-anchor", "middle")
         .style("font-size", "16px")
         .text("Top 10 Batsmen by Total Runs");
    }
  
    // wire it up
    select.on("change", fetchAndRender);
  
    // initial draw
    fetchAndRender();
  }
  