// frontend/js/individual.js

export function drawIndividualModule() {
  const container = d3.select("#individual-module");
  container.html("");

  // — Controls Row —
  const ctrl = container.append("div")
    .attr("class","controls")
    .style("display","flex")
    .style("align-items","center")
    .style("gap","10px");

  // Player label + input
  ctrl.append("label").attr("for","player-input").text("Player Name:");
  const playerInput = ctrl.append("input")
    .attr("type","text")
    .attr("id","player-input")
    .attr("placeholder","Please enter full name.")
    .style("flex","1")
    // default to Virat Kohli
    .property("value", "Virat Kohli");

  // Seasons dropdown
  ctrl.append("label").attr("for","seasons-dropdown").text("Seasons:");
  const seasonDropdown = ctrl.append("div")
    .attr("class","custom-dropdown")
    .attr("id","seasons-dropdown");
  const seasonToggle = seasonDropdown.append("button")
    .attr("type","button")
    .attr("class","dropdown-toggle")
    .text("All");
  const seasonMenu = seasonDropdown.append("div")
    .attr("class","dropdown-menu");

  const yearsArr = Array.from({ length: 2024 - 2008 + 1 }, (_, i) => String(2008 + i));
  ["all", ...yearsArr].forEach(y => {
    const lbl = seasonMenu.append("label");
    lbl.append("input")
      .attr("type","checkbox")
      .attr("value",y)
      .property("checked", y==="all");
    lbl.append("span").text(y);
  });

  // Close dropdown on outside click
  d3.select("body").on("click", e => {
    if (!seasonDropdown.node().contains(e.target))
      seasonDropdown.classed("open", false);
  });
  seasonToggle.on("click", () => {
    seasonDropdown.classed("open", !seasonDropdown.classed("open"));
  });
  seasonMenu.selectAll("input").on("change", function() {
    const checked = seasonMenu.selectAll("input").nodes()
      .filter(n=>n.checked).map(n=>n.value);
    if (checked.includes("all")) {
      seasonToggle.text("All");
      seasonMenu.selectAll("input")
        .property("checked", n=>n.value==="all");
    } else {
      seasonToggle.text(checked.join(", "));
      seasonMenu.select("input[value='all']").property("checked", false);
    }
  });

  // Show Stats button
  const submitBtn = ctrl.append("button")
    .attr("id","btn-individual")
    .text("Show Stats");

  // Stats output area
  const statsArea = container.append("div")
    .attr("id","individual-stats")
    .style("margin-top","20px");

  // Suggestion helper
  function showSuggestions(list) {
    statsArea.html("");
    statsArea.append("p").text("Did you mean:");
    const ul = statsArea.append("ul");
    ul.selectAll("li")
      .data(list)
      .join("li")
        .text(d=>d)
        .style("cursor","pointer")
        .on("click",(e,d)=>{
          playerInput.property("value",d);
          fetchAndShow();
        });
  }

  // Render the summary cards and charts
  function showStats(obj) {
    statsArea.html("");

    // Player name heading
    statsArea.append("h3").text(obj.player);

    // Batting row
    const battingCards = [
      { label: "Matches Played",  value: obj.bowling.matches_played },
      { label: "Total Runs",      value: obj.batting.total_runs },
      { label: "Fours",           value: obj.batting.fours },
      { label: "Sixes",           value: obj.batting.sixes },
      { label: "Avg. Score",      value: obj.batting.average?.toFixed(2) },
      { label: "Strike Rate",     value: obj.batting.strike_rate?.toFixed(2) }
    ];
    const batRow = statsArea.append("div").attr("class","stat-row");
    battingCards.forEach(d=>{
      batRow.append("div")
        .attr("class","stat-card bat-card")
        .html(`
          <div class="stat-value">${d.value ?? "—"}</div>
          <div class="stat-label">${d.label}</div>
        `);
    });

    // Bowling row
    const bowlingCards = [
      { label: "Runs Conceded",    value: obj.bowling.runs_conceded },
      { label: "Overs Bowled",     value: obj.bowling.overs?.toFixed(1) },
      { label: "Wickets",          value: obj.bowling.wickets },
      { label: "Economy Rate",     value: obj.bowling.economy?.toFixed(2) },
      { label: "3-Wkt Hauls",      value: obj.bowling.three_wicket_hauls },
      { label: "5-Wkt Hauls",      value: obj.bowling.five_wicket_hauls },
      { label: "Fielding Attempts",value: obj.fielding.fielding_attempts }
    ];
    const bowlRow = statsArea.append("div").attr("class","stat-row");
    bowlingCards.forEach(d=>{
      bowlRow.append("div")
        .attr("class","stat-card bowl-card")
        .html(`
          <div class="stat-value">${d.value ?? "—"}</div>
          <div class="stat-label">${d.label}</div>
        `);
    });

    // Line-chart helper
    function drawLine(data, xKey, yKey, yLabel, color) {
      const holder = statsArea.append("div")
        .attr("class","chart-area")
        .style("margin","1rem 0");
      const margin = { top:30, right:20, bottom:50, left:50 };
      const w = 600 - margin.left - margin.right;
      const h = 250 - margin.top - margin.bottom;
      const svg = holder.append("svg")
        .attr("viewBox",`0 0 ${w+margin.left+margin.right} ${h+margin.top+margin.bottom}`)
        .append("g")
          .attr("transform",`translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear()
        .domain(d3.extent(data, d=>d[xKey]))
        .range([0,w]);
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d=>d[yKey])]).nice()
        .range([h,0]);

      svg.append("g")
        .attr("transform",`translate(0,${h})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));
      svg.append("g").call(d3.axisLeft(y));

      // X-axis label
      svg.append("text")
        .attr("x", w/2).attr("y", h + margin.bottom - 10)
        .attr("text-anchor","middle")
        .style("font-size","12px")
        .text("Seasons");

      // Y-axis label
      svg.append("text")
        .attr("transform","rotate(-90)")
        .attr("x",-h/2).attr("y",-margin.left+15)
        .attr("text-anchor","middle")
        .style("font-size","12px")
        .text(yLabel);

      const line = d3.line()
        .x(d=>x(d[xKey]))
        .y(d=>y(d[yKey]));

      svg.append("path")
        .datum(data)
        .attr("fill","none")
        .attr("stroke",color)
        .attr("stroke-width",2)
        .attr("d",line);

      const tip = holder.append("div")
        .attr("class","tooltip")
        .style("position","absolute")
        .style("pointer-events","none")
        .style("display","none")
        .style("background","rgba(0,0,0,0.7)")
        .style("color","#fff")
        .style("padding","4px")
        .style("border-radius","4px");

      svg.selectAll("circle")
        .data(data)
        .join("circle")
          .attr("cx", d=>x(d[xKey]))
          .attr("cy", d=>y(d[yKey]))
          .attr("r",4)
          .attr("fill",color)
        .on("mouseover",(e,d)=>{
          tip.style("display","block")
             .html(`${xKey}: ${d[xKey]}<br>${yLabel}: ${d[yKey]}`);
          svg.append("text")
            .attr("class","hover-label")
            .attr("x", x(d[xKey]))
            .attr("y", y(d[yKey]) - 12)
            .attr("text-anchor","middle")
            .style("font-size","12px")
            .style("font-weight","600")
            .style("fill", color)
            .text(d[yKey]);
        })
        .on("mousemove", e=>{
          tip.style("left", (e.layerX+10)+"px")
             .style("top",  (e.layerY+10)+"px");
        })
        .on("mouseout",()=>{
          tip.style("display","none");
          svg.selectAll(".hover-label").remove();
        });
    }

    // Draw batting charts
    if (obj.batting.average > 10) {
      drawLine(obj.batting_season,"season","runs","Runs","#1f77b4");
      drawLine(obj.batting_season,"season","strike_rate","Strike Rate","#2ca02c");
    }
    // Draw bowling charts
    const wpM = obj.bowling.matches_played
      ? obj.bowling.wickets / obj.bowling.matches_played
      : 0;
    if (wpM > 0.3) {
      drawLine(obj.bowling_season,"season","wickets","Wickets","#d62728");
      drawLine(obj.bowling_season,"season","economy","Economy","#9467bd");
    }
  }

  // Fetch & display
  async function fetchAndShow() {
    const player = playerInput.property("value").trim();
    const selected = seasonMenu.selectAll("input").nodes()
      .filter(n=>n.checked).map(n=>n.value);
    const years = selected.includes("all") ? "all" : selected.join(",");

    if (!player) {
      statsArea.html("<p>Please enter a player name.</p>");
      return;
    }
    statsArea.html("<p>Loading…</p>");

    try {
      const res = await fetch(
        `/api/individual?player=${encodeURIComponent(player)}&years=${years}`
      );
      const data = await res.json();
      if (data.error) {
        statsArea.html(`<p style="color:red">${data.error}</p>`);
      } else if (data.suggestions) {
        showSuggestions(data.suggestions);
      } else {
        showStats(data);
      }
    } catch(err) {
      console.error(err);
      statsArea.html("<p>Error fetching data; check console.</p>");
    }
  }

  // Hook up & initial load
  submitBtn.on("click", fetchAndShow);
  fetchAndShow();
}
