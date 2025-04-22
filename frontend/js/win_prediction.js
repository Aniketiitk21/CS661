// frontend/js/win_prediction.js

export function drawWinPrediction(containerSelector, apiEndpoint = "/api/win_prediction") {
    const container = d3.select(containerSelector);
    container.html("");  // clear existing content
  
    // 1) Title
    container.append("h2")
      .text("Win Prediction Between Teams")
      .style("margin-bottom", "10px");
  
    // 2) Controls: two columns of 11 inputs each
    const ctrl = container.append("div")
      .attr("class", "controls")
      .style("display", "flex")
      .style("gap", "20px")
      .style("align-items", "flex-start");
  
    // Team 1
    const team1Div = ctrl.append("div").style("flex", "1");
    team1Div.append("h4").text("Team 1 Players:");
    const team1Inputs = team1Div.append("div");
    for (let i = 0; i < 11; i++) {
      team1Inputs.append("input")
        .attr("type", "text")
        .attr("placeholder", `Player ${i + 1}`);
    }
  
    // Team 2
    const team2Div = ctrl.append("div").style("flex", "1");
    team2Div.append("h4").text("Team 2 Players:");
    const team2Inputs = team2Div.append("div");
    for (let i = 0; i < 11; i++) {
      team2Inputs.append("input")
        .attr("type", "text")
        .attr("placeholder", `Player ${i + 1}`);
    }
  
    // Submit button
    const btn = ctrl.append("button")
      .text("Submit")
      .style("margin-top", "24px");
  
    // 3) Results area
    const resultArea = container.append("div")
      .attr("class", "chart-area")
      .style("margin-top", "20px");
  
    // 4) Fetch & compute probabilities
    btn.on("click", async () => {
      const team1 = team1Inputs.selectAll("input").nodes().map(n => n.value.trim());
      const team2 = team2Inputs.selectAll("input").nodes().map(n => n.value.trim());
  
      if (team1.some(p => !p) || team2.some(p => !p)) {
        resultArea.html("<p style='color:red'>All 11 players per team are required.</p>");
        return;
      }
  
      resultArea.html("<p>Loading…</p>");
  
      try {
        const url = `${apiEndpoint}?team1=${encodeURIComponent(team1.join(','))}` +
                    `&team2=${encodeURIComponent(team2.join(','))}`;
        const resp = await fetch(url);
        const { team1_score: s1, team2_score: s2 } = await resp.json();
  
        const total = s1 + s2;
        const p1 = total > 0 ? (s1 / total) * 100 : 50;
        const p2 = 100 - p1;
  
        renderResult(p1, p2);
      } catch (err) {
        console.error(err);
        resultArea.html("<p style='color:red'>Request failed; see console.</p>");
      }
    });
  
    // 5) Render the two‑tone probability bar
    function renderResult(p1, p2) {
      resultArea.html("");  // clear
  
      // Replace these with real team names if you capture them
      const name1 = "Team 1";
      const name2 = "Team 2";
  
      const barContainer = resultArea.append("div")
        .attr("class", "prob-bar-container");
  
      barContainer.append("span")
        .attr("class", "label")
        .text(`${name1} ${p1.toFixed(0)}%`);
  
      const wrapper = barContainer.append("div")
        .attr("class", "prob-bar-wrapper");
  
      wrapper.append("div")
        .attr("class", "prob-segment prob-team1")
        .style("width", `${p1}%`);
  
      wrapper.append("div")
        .attr("class", "prob-segment prob-team2")
        .style("width", `${p2}%`);
  
      barContainer.append("span")
        .attr("class", "label")
        .text(`${name2} ${p2.toFixed(0)}%`);
    }
  }
  