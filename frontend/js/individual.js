// frontend/js/individual.js

export function drawIndividualModule() {
    // 1) Grab and clear the container
    const container = d3.select("#individual-module");
    container.html("");
  
    // 2) Heading
    container.append("h2")
      .text("Individual Player Stats")
      .style("margin-bottom", "10px");
  
    // 3) Controls panel
    const ctrl = container.append("div")
      .attr("class", "controls")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "10px");
  
    // 3a) Player name input
    ctrl.append("label")
      .attr("for", "player-input")
      .text("Player Name:");
    const playerInput = ctrl.append("input")
      .attr("type", "text")
      .attr("id", "player-input")
      .attr("placeholder", "Please enter full name.")
      .style("flex", "1");
  
    // 3b) Seasons multi‑select
    ctrl.append("label")
      .attr("for", "year-select-individual")
      .text("Seasons:");
    const yearSelect = ctrl.append("select")
      .attr("id", "year-select-individual")
      .attr("multiple", true)
      .attr("size", 4)
      .style("width", "100px");
    // populate years
    const years = Array.from({ length: 2024-2008+1 }, (_,i) => String(2008+i));
    const opts = ["all", ...years];
    yearSelect.selectAll("option")
      .data(opts)
      .join("option")
        .attr("value", d => d)
        .property("selected", d => d==="all")
        .text(d => d);
  
    // 3c) Submit button
    const submitBtn = ctrl.append("button")
      .attr("id", "btn-individual")
      .text("Show Stats");
  
    // 4) Stats display area
    const statsArea = container.append("div")
      .attr("id", "individual-stats")
      .style("margin-top", "20px");
  
    // 5) Helpers to render suggestions or stats
    function showSuggestions(list) {
      statsArea.html("");
      statsArea.append("p").text("Did you mean:");
      const ul = statsArea.append("ul");
      ul.selectAll("li")
        .data(list)
        .join("li")
          .text(d => d)
          .style("cursor", "pointer")
          .on("click", (e,d) => {
            playerInput.property("value", d);
            fetchAndShow();          // immediately fetch stats
          });
    }
  
    function showStats(obj) {
      statsArea.html("");
      // Player name
      statsArea.append("h3").text(obj.player);
  
      const table = statsArea.append("table").attr("class", "stats-table");
      function row(label, val) {
        const tr = table.append("tr");
        tr.append("td").text(label);
        tr.append("td").text(val != null ? val : "—");
      }
  
      // batting
      row("Total Runs",      obj.batting.total_runs);
      row("Fours",           obj.batting.fours);
      row("Sixes",           obj.batting.sixes);
      row("Batting Average", obj.batting.average);
      row("Strike Rate",     obj.batting.strike_rate);
  
      // bowling
      row("Wickets",         obj.bowling.wickets);
      row("Runs Conceded",   obj.bowling.runs_conceded);
      row("Overs Bowled",    obj.bowling.overs);
      row("Economy Rate",    obj.bowling.economy);
  
      // fielding
      row("Fielding Attempts", obj.fielding.fielding_attempts);
    }
  
    // 6) Fetch + display
    async function fetchAndShow() {
      const player = playerInput.property("value").trim();
      const chosen = Array.from(yearSelect.node().selectedOptions).map(o => o.value);
      const years  = chosen.includes("all") ? "all" : chosen.filter(d=>d!=="all").join(",");
  
      if (!player) {
        statsArea.html("<p>Please enter a player name.</p>");
        return;
      }
  
      statsArea.html("<p>Loading…</p>");
      try {
        const res = await fetch(`/api/individual?player=${encodeURIComponent(player)}&years=${years}`);
        const data = await res.json();
  
        if (data.suggestions) {
          showSuggestions(data.suggestions);
        } else {
          showStats(data);
        }
      } catch(err) {
        console.error(err);
        statsArea.html("<p>Error fetching data; check console.</p>");
      }
    }
  
    // 7) Hook up the button
    submitBtn.on("click", fetchAndShow);
  }
  