// top_fielders.js
export function drawTopFieldersChart(containerSelector, apiEndpoint = "/api/top_fielders") {
    const container = d3.select(containerSelector);
    container.html("");
  
    const wrapper = container.append("div")
      .attr("class", "fielders-wrapper");
  
    // Controls
    const controls = wrapper.append("div")
      .attr("class", "controls");
    controls.append("label")
      .attr("for", "season-select-fielder")
      .text("Seasons:");
  
    const select = controls.append("select")
      .attr("id", "season-select-fielder")
      .attr("multiple", true)
      .attr("size", 6);
  
    const years = Array.from({ length: 2024 - 2008 + 1 }, (_, i) => String(2008 + i));
    const opts  = ["all", ...years];
    select.selectAll("option")
      .data(opts)
      .join("option")
        .attr("value", d => d)
        .property("selected", d => d === "all")
        .text(d => d);
  
    const chartArea = wrapper.append("div")
      .attr("class", "chart-area");
  
    // fire off the fetch + render
    select.on("change", fetchAndRender);
    fetchAndRender();
  
    function fetchAndRender() {
      const chosen = Array.from(select.node().selectedOptions).map(o => o.value);
      const yearsParam = chosen.includes("all")
        ? "all"
        : chosen.filter(d => d !== "all").join(",");
  
      d3.json(`${apiEndpoint}?years=${yearsParam}`)
        .then(data => renderChart(data))
        .catch(err => {
          console.error("Error loading fielders data:", err);
          chartArea.html("<p>Failed to load data; see console.</p>");
        });
    }
  
    function renderChart(data) {
      chartArea.selectAll("*").remove();
  
      if (!data.length) {
        chartArea.append("p").text("No data for the selected seasons.");
        return;
      }
  
      const margin = { top: 40, right: 20, bottom: 100, left: 60 };
      const width  = 800 - margin.left - margin.right;
      const height = 500 - margin.top  - margin.bottom;
  
      const svg = chartArea.append("svg")
          .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
          .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);
  
      // X = fielder names
      const x = d3.scaleBand()
        .domain(data.map(d => d.fielder))
        .range([0, width])
        .padding(0.2);
  
      // Y = fielding_attempts
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.fielding_attempts)])
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
          .attr("x",      d => x(d.fielder))
          .attr("y",      d => y(d.fielding_attempts))
          .attr("width",  x.bandwidth())
          .attr("height", d => height - y(d.fielding_attempts))
          .attr("fill",   "orange");
  
      // labels above bars
      svg.selectAll(".bar-label")
        .data(data)
        .join("text")
          .attr("class", "bar-label")
          .attr("x", d => x(d.fielder) + x.bandwidth() / 2)
          .attr("y", d => y(d.fielding_attempts) - 5)
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .text(d => d.fielding_attempts);
  
      // title
      svg.append("text")
         .attr("x", width / 2)
         .attr("y", -10)
         .attr("text-anchor", "middle")
         .style("font-size", "16px")
         .text("Top 10 Fielders by Fielding Attempts");
    }
  }
  