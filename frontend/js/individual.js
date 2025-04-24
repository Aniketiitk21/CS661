// frontend/js/individual.js

export function drawIndividualModule() {
  // 1) Container & clear
  const container = d3.select("#individual-module");
  container.html("");

  // 2) Heading
  container.append("h2")
    .text("Individual Player Stats")
    .style("margin-bottom", "10px");

  // 3) Controls row
  const ctrl = container.append("div")
    .attr("class", "controls")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "10px");

  // 3a) Player input
  ctrl.append("label")
    .attr("for", "player-input")
    .text("Player Name:");
  const playerInput = ctrl.append("input")
    .attr("type", "text")
    .attr("id", "player-input")
    .attr("placeholder", "Please enter full name.")
    .style("flex", "1");

  // 3b) Seasons select (still filters summary)
  ctrl.append("label")
    .attr("for", "year-select-individual")
    .text("Seasons:");
  const yearSelect = ctrl.append("select")
    .attr("id", "year-select-individual")
    .attr("multiple", true)
    .attr("size", 4)
    .style("width", "100px");
  const years = Array.from({ length: 2024 - 2008 + 1 }, (_, i) => String(2008 + i));
  const opts = ["all", ...years];
  yearSelect.selectAll("option")
    .data(opts)
    .join("option")
      .attr("value", d => d)
      .property("selected", d => d === "all")
      .text(d => d);

  // 3c) Submit
  const submitBtn = ctrl.append("button")
    .attr("id", "btn-individual")
    .text("Show Stats");

  // 4) Stats + charts area
  const statsArea = container.append("div")
    .attr("id", "individual-stats")
    .style("margin-top", "20px");

  // 5) Suggestion view
  function showSuggestions(list) {
    statsArea.html("");
    statsArea.append("p").text("Did you mean:");
    const ul = statsArea.append("ul");
    ul.selectAll("li")
      .data(list)
      .join("li")
        .text(d => d)
        .style("cursor", "pointer")
        .on("click", (e, d) => {
          playerInput.property("value", d);
          fetchAndShow();
        });
  }

  // 6) Render everything
  function showStats(obj) {
    statsArea.html("");

    // 6a) summary table
    statsArea.append("h3").text(obj.player);
    const table = statsArea.append("table").attr("class", "stats-table");
    function row(label, val) {
      const tr = table.append("tr");
      tr.append("td").text(label);
      tr.append("td").text(val != null ? val : "—");
    }
    // batting summary
    row("Total Runs",      obj.batting.total_runs);
    row("Fours",           obj.batting.fours);
    row("Sixes",           obj.batting.sixes);
    row("Batting Average", obj.batting.average);
    row("Strike Rate",     obj.batting.strike_rate);

    // bowling summary (added)
    row("Matches Played",      obj.bowling.matches_played);
    row("3-Wicket Hauls",      obj.bowling.three_wicket_hauls);
    row("5-Wicket Hauls",      obj.bowling.five_wicket_hauls);
    row("Wickets",             obj.bowling.wickets);
    row("Runs Conceded",       obj.bowling.runs_conceded);
    row("Overs Bowled",        obj.bowling.overs);
    row("Economy Rate",        obj.bowling.economy);

    // fielding summary
    row("Fielding Attempts",   obj.fielding.fielding_attempts);

    // 6b) helpers for charts ---------------------------------------------

    function drawLine(data, xKey, yKey, yLabel) {
      const holder = statsArea.append("div")
        .attr("class", "chart-area")
        .style("margin", "1rem 0");
      const margin = { top: 30, right: 20, bottom: 40, left: 50 };
      const w = 600 - margin.left - margin.right;
      const h = 250 - margin.top - margin.bottom;
      const svg = holder.append("svg")
        .attr("viewBox", `0 0 ${w + margin.left + margin.right} ${h + margin.top + margin.bottom}`)
        .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d[xKey]))
        .range([0, w]);
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[yKey])]).nice()
        .range([h, 0]);

      svg.append("g")
        .attr("transform", `translate(0,${h})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));
      svg.append("g")
        .call(d3.axisLeft(y));

      const line = d3.line()
        .x(d => x(d[xKey]))
        .y(d => y(d[yKey]));

      svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#1f77b4")
        .attr("stroke-width", 2)
        .attr("d", line);

      const tip = holder.append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("display", "none")
        .style("background", "rgba(0,0,0,0.7)")
        .style("color", "#fff")
        .style("padding", "4px")
        .style("border-radius", "4px");

      svg.selectAll("circle")
        .data(data)
        .join("circle")
          .attr("cx", d => x(d[xKey]))
          .attr("cy", d => y(d[yKey]))
          .attr("r", 4)
          .attr("fill", "#1f77b4")
          .on("mouseover", (e, d) => {
            tip.style("display", "block")
               .html(`${xKey}: ${d[xKey]}<br>${yLabel}: ${d[yKey]}`);
          })
          .on("mousemove", e => {
            tip.style("left", (e.layerX + 10) + "px")
               .style("top",  (e.layerY + 10) + "px");
          })
          .on("mouseout", () => tip.style("display", "none"));

      svg.append("text")
         .attr("transform", "rotate(-90)")
         .attr("x", -h/2).attr("y", -margin.left + 15)
         .attr("text-anchor", "middle")
         .style("font-size", "12px")
         .text(yLabel);
    }

    function drawBar(data, xKey, yKey, xLabel, yLabel) {
      const holder = statsArea.append("div")
        .attr("class", "chart-area")
        .style("margin", "1rem 0");
      const margin = { top: 30, right: 20, bottom: 80, left: 50 };
      const w = 600 - margin.left - margin.right;
      const h = 250 - margin.top - margin.bottom;
      const svg = holder.append("svg")
        .attr("viewBox", `0 0 ${w + margin.left + margin.right} ${h + margin.top + margin.bottom}`)
        .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand()
        .domain(data.map(d => d[xKey]))
        .range([0, w])
        .padding(0.2);
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[yKey])]).nice()
        .range([h, 0]);

      svg.append("g")
        .attr("transform", `translate(0,${h})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
          .attr("transform", "rotate(-40)")
          .style("text-anchor", "end");

      svg.append("g")
        .call(d3.axisLeft(y));

      const tip = holder.append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("display", "none")
        .style("background", "rgba(0,0,0,0.7)")
        .style("color", "#fff")
        .style("padding", "4px")
        .style("border-radius", "4px");

      svg.selectAll("rect")
        .data(data)
        .join("rect")
          .attr("x", d => x(d[xKey]))
          .attr("y", d => y(d[yKey]))
          .attr("width", x.bandwidth())
          .attr("height", d => h - y(d[yKey]))
          .attr("fill", "#ff7f0e")
          .on("mouseover", (e, d) => {
            tip.style("display", "block")
               .html(`${d[xKey]}: ${d[yKey]}`)
               .style("left", (e.layerX+10) + "px")
               .style("top",  (e.layerY+10) + "px");
          })
          .on("mouseout", () => tip.style("display", "none"));

      svg.append("text")
         .attr("transform", "rotate(-90)")
         .attr("x", -h/2).attr("y", -margin.left + 15)
         .attr("text-anchor", "middle")
         .style("font-size", "12px")
         .text(yLabel);
    }

    // — now conditionally draw batting & bowling charts —

    // batting only if AVG > 10
    if (obj.batting.average != null && obj.batting.average > 15) {
      statsArea.append("h3").text("Batting Runs by Season");
      drawLine(obj.batting_season,    "season", "runs",         "Runs");
      statsArea.append("h3").text("Batting Strike Rate by Season");
      drawLine(obj.batting_season,    "season", "strike_rate",  "Strike Rate");
      statsArea.append("h3").text("Batting Dismissal Modes");
      drawBar( obj.batting_dismissals,"mode",   "count",        "Mode",       "Count");
    }

    // bowling only if wickets per match > 0.5
    const wpM = obj.bowling.matches_played
      ? obj.bowling.wickets / obj.bowling.matches_played
      : 0;
    if (wpM > 0.5) {
      statsArea.append("h3").text("Bowling Wickets by Season");
      drawLine(obj.bowling_season,    "season", "wickets",      "Wickets");
      statsArea.append("h3").text("Bowling Economy by Season");
      drawLine(obj.bowling_season,    "season", "economy",      "Economy");
      statsArea.append("h3").text("Bowling Dismissal Modes");
      drawBar( obj.bowling_dismissals,"mode",   "count",        "Mode",       "Count");
    }
  }

  // 7) Fetch + display
  async function fetchAndShow() {
    const player = playerInput.property("value").trim();
    const chosen = Array.from(yearSelect.node().selectedOptions).map(o => o.value);
    const years   = chosen.includes("all")
      ? "all"
      : chosen.filter(d => d !== "all").join(",");

    if (!player) {
      statsArea.html("<p>Please enter a player name.</p>");
      return;
    }
    statsArea.html("<p>Loading…</p>");

    try {
      const res  = await fetch(`/api/individual?player=${encodeURIComponent(player)}&years=${years}`);
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

  // 8) Hook up
  submitBtn.on("click", fetchAndShow);
}
