// frontend/js/team_stats.js

export function drawTeamStats(containerSelector,
  statsEndpoint = "/api/team_stats",
  overviewEndpoint = "/api/team_overview") {

  const container = d3.select(containerSelector);
  container.html("");

  // 1) Controls row
  const ctrl = container.append("div")
    .attr("class", "team-stats-controls");

  // Team label
  ctrl.append("label")
    .attr("for", "team-dropdown")
    .text("Team:");

  // Team dropdown (short codes shown, full names sent to API)
  const teamDropdown = ctrl.append("div")
    .attr("class", "custom-dropdown")
    .attr("id", "team-dropdown");
  const teamToggle = teamDropdown.append("button")
    .attr("type", "button")
    .attr("class", "dropdown-toggle")
    .text("Select Team");
  const teamMenu = teamDropdown.append("div")
    .attr("class", "dropdown-menu");

  // Teams with code & full name
  const teamsArr = [
    { code: "MI",   name: "Mumbai Indians" },
    { code: "CSK",  name: "Chennai Super Kings" },
    { code: "RCB",  name: "Royal Challengers Bangalore" },
    { code: "KKR",  name: "Kolkata Knight Riders" },
    { code: "SRH",  name: "Sunrisers Hyderabad" },
    { code: "DC",   name: "Delhi Capitals" },
    { code: "PBKS", name: "Punjab Kings" },
    { code: "RR",   name: "Rajasthan Royals" },
    { code: "LSG",  name: "Lucknow Super Giants" },
    { code: "GT",   name: "Gujarat Titans" },
    { code: "GL",   name: "Gujarat Lions" },
    { code: "DECC", name: "Deccan Chargers" },
    { code: "KTK",  name: "Kochi Tuskers Kerala" },
    { code: "RPS",  name: "Rising Pune Supergiants" },
    { code: "PW",   name: "Pune Warriors" }
  ];

  // Populate dropdown: input.value=fullName, span text=code
  teamsArr.forEach(t => {
    const lbl = teamMenu.append("label");
    lbl.append("input")
      .attr("type", "radio")
      .attr("name", "team-radio")
      .attr("value", t.name)
      .attr("data-code", t.code);
    lbl.append("span")
      .text(t.code);
  });

  // Default to first team (Mumbai Indians)
  const defaultTeam = teamsArr[0];
  teamMenu.select(`input[value="${defaultTeam.name}"]`)
    .property("checked", true);
  teamToggle.text(defaultTeam.code);

  // 2) Season Dropdown
  ctrl.append("label")
    .attr("for", "seasons-dropdown")
    .text("Seasons:");
  const seasonDropdown = ctrl.append("div")
    .attr("class", "custom-dropdown")
    .attr("id", "seasons-dropdown");
  const seasonToggle = seasonDropdown.append("button")
    .attr("type", "button")
    .attr("class", "dropdown-toggle")
    .text("All");
  const seasonMenu = seasonDropdown.append("div")
    .attr("class", "dropdown-menu");

  const yearsArr = Array.from({ length: 2024 - 2008 + 1 }, (_, i) => String(2008 + i));
  ["all", ...yearsArr].forEach(y => {
    const lbl = seasonMenu.append("label");
    lbl.append("input")
      .attr("type", "checkbox")
      .attr("value", y)
      .property("checked", y === "all");
    lbl.append("span").text(y);
  });

  ctrl.append("button")
    .attr("id", "show-stats-btn")
    .text("Show Stats");

  // ========== Dropdown open/close ==========
  d3.select("body").on("click", e => {
    if (!teamDropdown.node().contains(e.target))
      teamDropdown.classed("open", false);
    if (!seasonDropdown.node().contains(e.target))
      seasonDropdown.classed("open", false);
  });

  teamToggle.on("click", () => {
    teamDropdown.classed("open", !teamDropdown.classed("open"));
  });
  seasonToggle.on("click", () => {
    seasonDropdown.classed("open", !seasonDropdown.classed("open"));
  });

  // When team selected: show code, store full name in input.value
  teamMenu.selectAll("input").on("change", function() {
    const fullName = this.value;
    const code = this.getAttribute("data-code");
    teamToggle.text(code);
    teamDropdown.classed("open", false);
  });

  // When seasons change
  seasonMenu.selectAll("input").on("change", function() {
    const checked = seasonMenu.selectAll("input").nodes()
      .filter(n => n.checked).map(n => n.value);
    if (checked.includes("all")) {
      seasonToggle.text("All");
      seasonMenu.selectAll("input")
        .property("checked", n => n.value === "all");
    } else {
      seasonToggle.text(checked.join(", "));
      seasonMenu.select("input[value='all']")
        .property("checked", false);
    }
  });

  // shared tooltip
  let tooltip = d3.select("body").select(".team-tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body")
      .append("div")
      .attr("class","team-tooltip");
  }

  // 3) Prepare 2×2 grid placeholders
  const resultArea = container.append("div").attr("class","team-stats-result");
  const winlossArea = resultArea.append("div")
    .attr("id","winloss-chart").attr("class","chart-area");
  const rightStack = resultArea.append("div").attr("id","right-charts");
  const battersArea = rightStack.append("div")
    .attr("id","top5-batters-chart").attr("class","chart-area");
  const bowlersArea = rightStack.append("div")
    .attr("id","top5-bowlers-chart").attr("class","chart-area");
  const chasesArea = resultArea.append("div")
    .attr("id","chases-table").attr("class","table-area");
  const defsArea = resultArea.append("div")
    .attr("id","defenses-table").attr("class","table-area");

  // 4) Fetch & render on button click
  d3.select("#show-stats-btn").on("click", async () => {
    // get full team name from checked radio
    const selInput = teamMenu.select("input[name='team-radio']:checked").node();
    const team = selInput ? selInput.value : "";

    const checked = seasonMenu.selectAll("input").nodes()
      .filter(n => n.checked).map(n => n.value);
    const yearsParam = checked.includes("all")
      ? "all"
      : checked.filter(y => y !== "all").join(",");

    if (!team) {
      winlossArea.html("<p>Please select a team.</p>");
      return;
    }
    [winlossArea, battersArea, bowlersArea, chasesArea, defsArea]
      .forEach(a => a.html("<p>Loading…</p>"));

    try {
      const statsRes = await fetch(
        `${statsEndpoint}?team=${encodeURIComponent(team)}&years=${yearsParam}`);
      const statsData = await statsRes.json();
      if (statsData.error) throw new Error(statsData.error);

      const ovRes = await fetch(
        `${overviewEndpoint}?team=${encodeURIComponent(team)}&years=${yearsParam}`);
      const ovData = ovRes.ok
        ? await ovRes.json()
        : null;

      winlossArea.html("");
      drawWinLossChart(winlossArea, statsData.stats);

      battersArea.html("");
      drawHorizontalBarChart(
        battersArea,
        ovData.top5_batters,
        "batter", "runs",
        "Top 5 🏏 Run-Scorers"
      );

      bowlersArea.html("");
      drawHorizontalBarChart(
        bowlersArea,
        ovData.top5_bowlers,
        "bowler", "wickets",
        "Top 5 🏆 Wicket-Takers"
      );

      chasesArea.html("");
      drawSimpleTable(
        chasesArea,
        ovData.top5_chases,
        ["Opposition","Target"],
        ["opposition","target"]
      );

      defsArea.html("");
      drawSimpleTable(
        defsArea,
        ovData.top5_defenses,
        ["Opposition","Defended"],
        ["opposition","target"]
      );

    } catch(err) {
      console.error(err);
      winlossArea.html(`<p style="color:red">${err.message}</p>`);
    }
  })
  // dispatch click once so default MI loads immediately
  .dispatch("click");

  // ——————————————————————————
  function drawWinLossChart(container,data){
    container.append("h3")
      .text("📊 Wins vs Losses")
      .style("margin","0.5rem 1rem")
      .style("color","#1f4f82");

    const m={top:40,right:20,bottom:60,left:60},
          W=container.node().clientWidth - m.left - m.right,
          H=container.node().clientHeight - m.top - m.bottom;
    const svg = container.append("svg")
      .attr("width",W+m.left+m.right)
      .attr("height",H+m.top+m.bottom)
      .append("g")
      .attr("transform",`translate(${m.left},${m.top})`);

    const types = data.map(d=>d.type),
          keys  = ["wins","losses"],
          color = d3.scaleOrdinal().domain(keys).range(["#4C79A7","#f2a900"]),
          x0 = d3.scaleBand().domain(types).range([0,W]).padding(0.3),
          x1 = d3.scaleBand().domain(keys).range([0,x0.bandwidth()]).padding(0.05),
          y  = d3.scaleLinear()
                 .domain([0, d3.max(data,d=>Math.max(d.wins,d.losses))]).nice()
                 .range([H,0]);

    svg.append("g").call(d3.axisLeft(y).ticks(5));
    svg.append("g")
      .attr("transform",`translate(0,${H})`)
      .call(d3.axisBottom(x0));

    svg.append("text")
      .attr("x",-H/2).attr("y",-m.left+15)
      .attr("transform","rotate(-90)")
      .attr("text-anchor","middle")
      .style("fill","#333")
      .style("font-size","0.9rem")
      .text("Count");

    svg.append("text")
      .attr("x",W/2).attr("y",H + m.bottom - 15)
      .attr("text-anchor","middle")
      .style("fill","#333")
      .style("font-size","0.9rem")
      .text("Match Type");

    const grp = svg.selectAll("g.layer")
      .data(data).enter().append("g")
        .attr("transform",d=>`translate(${x0(d.type)},0)`);

    grp.selectAll("rect")
      .data(d=>keys.map(k=>({key:k,value:d[k]})))
      .enter().append("rect")
        .attr("x", d=> x1(d.key))
        .attr("y", H)
        .attr("width", x1.bandwidth())
        .attr("height", 0)
        .attr("fill", d=> color(d.key))
        .on("mouseover", (event,d) => {
          tooltip
            .style("left", `${event.pageX+8}px`)
            .style("top",  `${event.pageY+8}px`)
            .style("display","block")
            .text(`${d.key} → ${d.value}`);
        })
        .on("mousemove", (event) => {
          tooltip
            .style("left", `${event.pageX+8}px`)
            .style("top",  `${event.pageY+8}px`);
        })
        .on("mouseout", () => {
          tooltip.style("display","none");
        })
      .transition().duration(800).ease(d3.easeCubicOut)
        .attr("y", d=> y(d.value))
        .attr("height", d=> H - y(d.value));
  }

  // ——————————————————————————
  function drawHorizontalBarChart(container,data,labelKey,valueKey,title){
    container.append("h3")
      .text(title)
      .style("margin","0.5rem 1rem")
      .style("color","#1f4f82");

    const m={top:20,right:20,bottom:40,left:120},
          W=container.node().clientWidth - m.left - m.right,
          H=container.node().clientHeight - m.top - m.bottom - 30;
    const svg = container.append("svg")
      .attr("width",W+m.left+m.right)
      .attr("height",H+m.top+m.bottom)
      .append("g")
      .attr("transform",`translate(${m.left},${m.top})`);

    const cats = data.map(d=>d[labelKey]),
          vals = data.map(d=>d[valueKey]),
          y = d3.scaleBand().domain(cats).range([0,H]).padding(0.3),
          x = d3.scaleLinear().domain([0, d3.max(vals)]).nice().range([0,W]);

    svg.append("g").call(d3.axisLeft(y));
    svg.append("g").attr("transform",`translate(0,${H})`)
       .call(d3.axisBottom(x).ticks(4));

    svg.selectAll("rect")
      .data(data)
      .enter().append("rect")
        .attr("y", d=> y(d[labelKey]))
        .attr("height", y.bandwidth())
        .attr("x",  0)
        .attr("width", 0)
        .attr("fill","#4C79A7")
        .on("mouseover", (event,d) => {
          tooltip
            .style("left", `${event.pageX+8}px`)
            .style("top",  `${event.pageY+8}px`)
            .style("display","block")
            .text(`${d[labelKey]} → ${d[valueKey]}`);
        })
        .on("mousemove", (event) => {
          tooltip
            .style("left", `${event.pageX+8}px`)
            .style("top",  `${event.pageY+8}px`);
        })
        .on("mouseout", () => {
          tooltip.style("display","none");
        })
      .transition().duration(800).ease(d3.easeCubicOut)
        .attr("width", d=> x(d[valueKey]));
  }

  // ——————————————————————————
  function drawSimpleTable(container,data,headers,keys){
    const tbl = container.append("table").attr("class","stats-table");
    const thead = tbl.append("thead").append("tr");
    headers.forEach(h=> thead.append("th").text(h));
    const tbody = tbl.append("tbody");
    data.forEach(d=>{
      const tr = tbody.append("tr");
      keys.forEach(k=> tr.append("td").text(d[k]));
    });
  }
}
