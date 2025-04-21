// top_bowlers.js
export function drawTopBowlersChart(containerSelector, apiEndpoint = "/api/top_bowlers") {
    const container = d3.select(containerSelector);
    container.html("");
  
    const wrapper = container.append("div").attr("class", "bowlers-wrapper");
  
    // Controls
    const controls = wrapper.append("div").attr("class", "controls");
    controls.append("label")
      .attr("for", "season-select-bowler")
      .text("Seasons:");
  
    const select = controls.append("select")
      .attr("id", "season-select-bowler")
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
  
    const chartArea = wrapper.append("div").attr("class", "chart-area");
  
    function fetchAndRender() {
      const chosen = Array.from(select.node().selectedOptions).map(o => o.value);
      const yearsParam = chosen.includes("all")
        ? "all"
        : chosen.filter(d => d !== "all").join(",");
  
      d3.json(`${apiEndpoint}?years=${yearsParam}`)
        .then(data => renderChart(data))
        .catch(err => {
          console.error("Error loading bowlers data:", err);
          chartArea.html("<p>Failed to load data; see console.</p>");
        });
    }
  
    function renderChart(data) {
      chartArea.selectAll("*").remove();
  
      const margin = { top: 40, right: 20, bottom: 100, left: 60 };
      const width  = 800 - margin.left - margin.right;
      const height = 500 - margin.top  - margin.bottom;
  
      const svg = chartArea.append("svg")
          .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
          .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);
  
      const x = d3.scaleBand()
        .domain(data.map(d => d.bowler))
        .range([0, width])
        .padding(0.2);
  
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.wickets)])
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
          .attr("x",      d => x(d.bowler))
          .attr("y",      d => y(d.wickets))
          .attr("width",  x.bandwidth())
          .attr("height", d => height - y(d.wickets))
          .attr("fill",   "#FF7F0E");
  
      // labels
      svg.selectAll(".bar-label")
        .data(data)
        .join("text")
          .attr("class", "bar-label")
          .attr("x", d => x(d.bowler) + x.bandwidth() / 2)
          .attr("y", d => y(d.wickets) - 5)
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .text(d => d.wickets);
  
      // title
      svg.append("text")
         .attr("x", width / 2)
         .attr("y", -10)
         .attr("text-anchor", "middle")
         .style("font-size", "16px")
         .text("Top 10 Bowlers by Wickets");
    }
  
    select.on("change", fetchAndRender);
    fetchAndRender();
  }
  