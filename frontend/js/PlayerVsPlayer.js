// frontend/js/PlayerVsPlayer.js
export function drawPlayerVsPlayerTable(containerSelector,
    apiEndpoint = "/api/player_vs_player") {
    const container = d3.select(containerSelector);
    container.html("");
  
    container.append("h2")
      .text("Player vs Player Comparison")
      .style("margin-bottom", "10px");
  
    const ctrl = container.append("div")
      .attr("class", "controls")
      .style("display", "flex")
      .style("gap", "10px")
      .style("align-items", "center");
  
    ctrl.append("label").text("Player A:");
    const aInput = ctrl.append("input")
      .attr("type", "text")
      .attr("placeholder", "e.g. Virat Kohli");
  
    ctrl.append("label").text("Player B:");
    const bInput = ctrl.append("input")
      .attr("type", "text")
      .attr("placeholder", "e.g. Rohit Sharma");
  
    ctrl.append("label").text("Seasons:");
    const yearSelect = ctrl.append("select")
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
  
    const btn = ctrl.append("button")
      .text("Compare");
  
    const resultArea = container.append("div")
      .attr("class", "chart-area")
      .style("margin-top", "20px");
  
    btn.on("click", async () => {
      const pa = aInput.property("value").trim();
      const pb = bInput.property("value").trim();
      const sel = Array.from(yearSelect.node().selectedOptions).map(o => o.value);
      const yrs = sel.includes("all")
        ? "all"
        : sel.filter(d => d !== "all").join(",");
  
      if (!pa || !pb) {
        resultArea.html("<p>Please enter both players</p>");
        return;
      }
      resultArea.html("<p>Loading…</p>");
  
      try {
        const res = await fetch(
          `${apiEndpoint}?playerA=${encodeURIComponent(pa)}` +
          `&playerB=${encodeURIComponent(pb)}&years=${yrs}`
        );
        const data = await res.json();
        if (data.error) {
          resultArea.html(`<p style="color:red">${data.error}</p>`);
        } else {
          renderTable(data);
        }
      } catch (e) {
        console.error(e);
        resultArea.html("<p>Request failed; see console</p>");
      }
    });
  
    function renderTable(d) {
      resultArea.html("");
  
      // header row: Metric | A | B
      const table = resultArea.append("table")
        .attr("class", "stats-table");
  
      const thead = table.append("thead");
      const hr = thead.append("tr");
      ["Metric", d.playerA.player, d.playerB.player].forEach(h =>
        hr.append("th")
          .text(h)
          .style("padding", "6px 8px")
          .style("border-bottom", "2px solid #ccc")
      );
  
      const tbody = table.append("tbody");
      // list all keys in batting, bowling, fielding
      const rows = [
        ["Total Runs",        d.playerA.batting.total_runs,     d.playerB.batting.total_runs],
        ["Fours",             d.playerA.batting.fours,           d.playerB.batting.fours],
        ["Sixes",             d.playerA.batting.sixes,           d.playerB.batting.sixes],
        ["Batting Avg",       d.playerA.batting.average,         d.playerB.batting.average],
        ["Strike Rate",       d.playerA.batting.strike_rate,     d.playerB.batting.strike_rate],
        ["Wickets",           d.playerA.bowling.wickets,         d.playerB.bowling.wickets],
        ["Runs Conceded",     d.playerA.bowling.runs_conceded,   d.playerB.bowling.runs_conceded],
        ["Overs",             d.playerA.bowling.overs,           d.playerB.bowling.overs],
        ["Economy",           d.playerA.bowling.economy,         d.playerB.bowling.economy],
        ["Fielding Attempts", d.playerA.fielding.fielding_attempts,
                              d.playerB.fielding.fielding_attempts]
      ];
  
      rows.forEach(([label, vA, vB]) => {
        const tr = tbody.append("tr");
        tr.append("td")
          .text(label)
          .style("padding", "6px 8px")
          .style("border-bottom", "1px solid #eee");
        tr.append("td")
          .text(vA != null ? vA : "—")
          .style("padding", "6px 8px")
          .style("border-bottom", "1px solid #eee");
        tr.append("td")
          .text(vB != null ? vB : "—")
          .style("padding", "6px 8px")
          .style("border-bottom", "1px solid #eee");
      });
    }
  }
  