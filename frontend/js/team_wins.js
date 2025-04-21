// team_wins.js
export function drawTeamWinsChart(containerSelector, apiEndpoint = "/api/team_wins") {
    const container = d3.select(containerSelector);
    container.html("");
  
    //
    // 1) CONTROLS + CHART WRAPPER
    //
    const wrapper = container
      .append("div")
      .attr("class", "teams-wrapper");
  
    const controls = wrapper
      .append("div")
      .attr("class", "controls");
  
    controls.append("label")
      .attr("for", "season-select-teams")
      .text("Seasons:");
  
    const select = controls.append("select")
      .attr("id", "season-select-teams")
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
          console.error("Error loading team wins:", err);
          chartArea.html("<p>Failed to load data; see console</p>");
        });
    }
  
    select.on("change", fetchAndRender);
    fetchAndRender();
  
    //
    // 3) DRAW THE BAR CHART
    //
    function renderChart(data) {
      chartArea.selectAll("*").remove();
  
      if (!data.length) {
        chartArea.append("p").text("No data for these seasons.");
        return;
      }
  
      // **Re-map** your fields: { count: number, wins: teamName }
      const parsed = data.map(d => ({
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
  
      // X‐scale & axis
      const x = d3.scaleBand()
        .domain(parsed.map(d => d.team))
        .range([0, width])
        .padding(0.2);
  
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
          .attr("transform","rotate(-45)")
          .style("text-anchor","end")
          .style("font-size","10px");
  
      // Y‐scale & axis
      const y = d3.scaleLinear()
        .domain([0, d3.max(parsed, d => d.wins)])
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
        .data(parsed)
        .join("rect")
          .attr("class","bar")
          .attr("x",      d => x(d.team))
          .attr("y",      d => y(d.wins))
          .attr("width",  bw)
          .attr("height", d => height - y(d.wins))
          .attr("fill","#2ca02c");
  
      // labels above bars
      svg.selectAll(".bar-label")
        .data(parsed)
        .join("text")
          .attr("class","bar-label")
          .attr("x", d => x(d.team) + bw/2)
          .attr("y", d => y(d.wins) - 5)
          .attr("text-anchor","middle")
          .style("font-size","10px")
          .style("fill","#333")
          .text(d => d.wins);
  
      // title
      svg.append("text")
         .attr("x", width/2)
         .attr("y", -10)
         .attr("text-anchor","middle")
         .style("font-size","16px")
         .text("Team Wins by Season(s)");
    }
  }
  