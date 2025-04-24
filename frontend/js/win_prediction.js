// frontend/js/win_prediction.js
export function drawWinPrediction(containerSelector, apiEndpoint = "/api/win_prediction") {
  const DEFAULT_TEAM1 = [
    "Virat Kohli","AB de Villiers","Faf du Plessis","Devdutt Padikkal",
    "Glenn Maxwell","Chris Morris","Mohammed Siraj","Yuzvendra Chahal",
    "Navdeep Saini","Kyle Jamieson","Harshal Patel"
  ];
  const DEFAULT_TEAM2 = [
    "Rohit Sharma","Quinton de Kock","Suryakumar Yadav","Ishan Kishan",
    "Tilak Varma","Hardik Pandya","Kieron Pollard","Jasprit Bumrah",
    "Trent Boult","Rahul Chahar","Kumar Kartikeya"
  ];

  const container = d3.select(containerSelector).html("");

  // --- TEAM PANELS ROW ---
  const teamRow = container.append("div")
    .attr("class","team-container")
    .style("display","flex")
    .style("gap","20px")
    .style("width","100%");

  function makeTeamPanel(label, defaults) {
    const panel = teamRow.append("div")
      .attr("class","team-panel")
      .style("flex","1")
      .style("border","1px solid #ccc")
      .style("border-radius","4px")
      .style("padding","10px")
      .style("box-shadow","0 2px 4px rgba(0,0,0,0.1)");
    panel.append("h4").text(label).style("margin-bottom","10px");
    const list = panel.append("div");
    defaults.forEach((name,i) => {
      const row = list.append("div")
        .style("display","flex")
        .style("gap","8px")
        .style("margin-bottom","6px");
      row.append("input")
        .attr("type","text")
        .attr("value", name)
        .style("flex","1")
        .style("padding","4px");
      row.append("select")
        .style("padding","4px")
        .selectAll("option")
        .data(["Batsman","All-Rounder","Bowler"])
        .join("option")
          .property("selected", d => {
            if (i >= 8) return d==="Bowler";
            if (i >= 5) return d==="All-Rounder";
            return d==="Batsman";
          })
          .text(d => d);
    });
    return list;
  }

  const team1Inputs = makeTeamPanel("Team 1", DEFAULT_TEAM1);
  const team2Inputs = makeTeamPanel("Team 2", DEFAULT_TEAM2);

  // --- BUTTONS ROW ---
  const btnRow = container.append("div")
    .attr("class","button-container")
    .style("display","flex")
    .style("justify-content","center")
    .style("gap","12px")
    .style("margin","20px 0");

  const btnSubmit = btnRow.append("button")
    .text("Submit")
    .style("padding","8px 16px");
  const btnClear = btnRow.append("button")
    .text("Clear Teams")
    .style("padding","8px 16px");

  // Results area
  const resultArea = container.append("div")
    .attr("class", "chart-area")
    .style("margin-top", "20px");

  // Clear logic
  btnClear.on("click", () => {
    team1Inputs.selectAll("div").nodes().forEach((row) => {
      row.querySelector("input").value = "";
      row.querySelector("select").value = "Batsman";
    });
    team2Inputs.selectAll("div").nodes().forEach((row) => {
      row.querySelector("input").value = "";
      row.querySelector("select").value = "Batsman";
    });
    resultArea.html("");
  });

  // Submit & fetch logic
  btnSubmit.on("click", async () => {
    const gather = list => list.selectAll("div").nodes().map(r => ({
      name: r.querySelector("input").value.trim(),
      role: r.querySelector("select").value
    }));
    const team1 = gather(team1Inputs), team2 = gather(team2Inputs);

    if (team1.some(p=>!p.name) || team2.some(p=>!p.name)) {
      resultArea.html("<p style='color:red;text-align:center'>All 11 players per team are required.</p>");
      return;
    }

    resultArea.html("<p style='text-align:center'>Loading…</p>");
    try {
      const params = new URLSearchParams();
      params.append("team1", team1.map(p=>p.name).join(","));
      params.append("roles1", team1.map(p=>p.role).join(","));
      params.append("team2", team2.map(p=>p.name).join(","));
      params.append("roles2", team2.map(p=>p.role).join(","));
      const resp = await fetch(`${apiEndpoint}?${params.toString()}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error||resp.statusText);
      renderResult(data);
    } catch(err) {
      console.error(err);
      resultArea.html("<p style='color:red;text-align:center'>Request failed; check console.</p>");
    }
  });

  // Render bars
  function renderResult(data) {
    const { team1: t1, team2: t2 } = data;
    const pct = (a,b) => { const s = a+b; return s>0 ? (a/s*100) : 50; };
    const bars = [
      ["Overall Win Probability",    data.team1.prob, data.team2.prob],
      ["Batting Probability",        pct(t1.batting,t2.batting), null],
      ["Bowling Probability",        pct(t1.bowling,t2.bowling), null],
      ["Fielding Probability",       pct(t1.fielding,t2.fielding), null]
    ];

    resultArea.html("");
    bars.forEach(([title,p1,p2]) => {
      if (p2 === null) p2 = 100 - p1;
      const sec = resultArea.append("div").style("margin","12px 0");
      sec.append("h4").text(title).style("margin-bottom","6px");
      const row = sec.append("div")
        .style("display","flex")
        .style("align-items","center")
        .style("gap","8px");
      row.append("span").text(`T1 ${p1.toFixed(2)}%`);
      const bar = row.append("div")
        .style("flex","1")
        .style("display","flex")
        .style("height","14px")
        .style("background","#eee")
        .style("border-radius","4px")
        .style("overflow","hidden");
      bar.append("div")
        .style("width",`${p1}%`)
        .style("background","#4a90e2");
      bar.append("div")
        .style("width",`${p2}%`)
        .style("background","#50e3c2");
      row.append("span").text(`T2 ${p2.toFixed(2)}%`);
    });
  }
}
