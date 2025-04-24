// frontend/js/pointsTable.js
export function drawPointsTable(containerSelector,
    apiEndpoint = "/api/points_table") {

  const container = d3.select(containerSelector);
  container.html("");

  // Create a tooltip div
  const tooltip = d3.select("body").append("div")
    .attr("class","tooltip")
    .style("position","absolute")
    .style("pointer-events","none")
    .style("padding","6px 10px")
    .style("background","rgba(0,0,0,0.7)")
    .style("color","#fff")
    .style("border-radius","4px")
    .style("font-size","0.85rem")
    .style("opacity",0);

  // — Controls —
  const ctrl = container.append("div")
    .attr("class","controls")
    .style("display","flex")
    .style("gap","10px")
    .style("align-items","center")
    .style("margin-bottom","10px");
  ctrl.append("label").attr("for","points-year-select").text("Season:");
  const select = ctrl.append("select")
    .attr("id","points-year-select")
    .style("padding","6px 8px");
  const years = Array.from({ length: 2024 - 2008 + 1 }, (_, i) => String(2008 + i));
  select.selectAll("option")
    .data(years).join("option")
      .attr("value", d => d)
      .text(d => d);
  select.property("value", years[years.length - 1]);
  const btn = ctrl.append("button")
    .text("Show Table")
    .style("padding","6px 12px");

  // — Results —
  const resultArea = container.append("div")
    .attr("class","chart-area")
    .style("margin-top","20px");

  btn.on("click", fetchAndRender);
  fetchAndRender();

  async function fetchAndRender() {
    const year = select.property("value");
    resultArea.html("<p>Loading…</p>");

    try {
      // fetch points table as text, sanitize NaN → null
      const ptsResp = await fetch(`${apiEndpoint}?year=${year}`);
      const ptsText = await ptsResp.text();
      const pts = JSON.parse(ptsText.replace(/\bNaN\b/g,'null'));

      // fetch other endpoints in parallel
      const [orange, purple, bats, bowl, summary] = await Promise.all([
        fetch(`/api/orange_cap?years=${year}`).then(r => r.json()),
        fetch(`/api/purple_cap?years=${year}`).then(r => r.json()),
        fetch(`/api/batsmen_scatter_data?years=${year}`).then(r => r.json()),
        fetch(`/api/bowlers_scatter_data?years=${year}`).then(r => r.json()),
        fetch(`/api/season_summary?years=${year}`).then(r => r.json())
      ]);

      resultArea.html("");
      renderTable(pts);
      renderCaps(orange, purple, year);
      renderSummary(summary);
      renderScatters(bats, bowl);

    } catch(err) {
      console.error(err);
      resultArea.html("<p style='color:red'>Request failed; see console.</p>");
    }
  }

  // — points table —
  function renderTable(rows) {
    if (!rows.length) {
      resultArea.append("p").text("No points data for this season.");
      return;
    }
    const tbl = resultArea.append("table")
      .attr("class","stats-table")
      .style("width","100%")
      .style("border-collapse","collapse")
      .style("margin-bottom","20px");
    const thead = tbl.append("thead").append("tr");
    ["Team","Pld","W","L","NR","Pts","NRR"].forEach(h =>
      thead.append("th")
        .text(h)
        .style("padding","6px 8px")
        .style("border-bottom","2px solid #ccc")
    );
    const tbody = tbl.append("tbody");
    rows.forEach(r => {
      const tr = tbody.append("tr");
      ["team","matches_played","wins","losses","no_result","points","nrr"]
        .forEach(k => {
          let txt;
          if (k === "nrr") {
            txt = (r[k] == null) ? "–" : r[k].toFixed(3);
          } else {
            txt = r[k];
          }
          tr.append("td").text(txt);
        });
      tr.selectAll("td")
        .style("padding","6px 8px")
        .style("border-bottom","1px solid #eee");
    });
  }

  // — caps —
  function renderCaps(orange, purple, year) {
    const div = resultArea.append("div")
      .style("margin","20px 0")
      .style("font-size","1rem");
    const o = orange[0] || {};
    div.append("p")
      .html(`<strong>Orange Cap ${year}:</strong> ${o.batter||"N/A"} (${o.total_runs||0} runs)`);
    const p = purple[0] || {};
    div.append("p")
      .html(`<strong>Purple Cap ${year}:</strong> ${p.bowler||"N/A"} (${p.wickets||0} wickets)`);
  }

  // — season summary —
  function renderSummary(s) {
    const div = resultArea.append("div")
      .attr("class","season-summary")
      .style("margin","20px 0")
      .style("font-size","1rem")
      .style("line-height","1.4");
    div.append("p")
      .html(`<strong>Total Sixes:</strong> ${s.total_sixes}`);
    div.append("p")
      .html(`<strong>Total Fours:</strong> ${s.total_fours}`);
    div.append("p")
      .html(`<strong>Total Dot Balls:</strong> ${s.total_dot_balls}`);
    div.append("p")
      .html(`<strong>Avg. Innings Score:</strong> ${s.avg_innings_score.toFixed(2)}`);
    div.append("p")
      .html(`<strong>Avg. Wickets/Match:</strong> ${s.avg_wickets_per_match.toFixed(2)}`);
  }

  // — scatters —
  function renderScatters(batsData, bowlData) {
    const W = 400, H = 300;
    const row = resultArea.append("div")
      .style("display","flex")
      .style("gap","20px")
      .style("margin-top","30px");

    row.append("div").attr("id","bats-scatter")
      .style("width",W+"px").style("height",H+"px");
    drawScatter({
      data:batsData, selector:"#bats-scatter", title:"Top 50 Batsmen",
      xKey:"runs", yKey:"strike_rate", labelKey:"batter",
      xLabel:"Runs", yLabel:"Strike Rate",
      extraKeys:["sixes","fours"], xMin:100, xStep:50,
      width:W, height:H
    });

    row.append("div").attr("id","bowl-scatter")
      .style("width",W+"px").style("height",H+"px");
    drawScatter({
      data:bowlData, selector:"#bowl-scatter", title:"Top 50 Bowlers",
      xKey:"wickets", yKey:"economy_rate", labelKey:"bowler",
      xLabel:"Wickets", yLabel:"Economy Rate",
      extraKeys:["dot_balls"], yStep:1,
      width:W, height:H
    });
  }

  /**
   * Generic scatter drawer.
   */
  function drawScatter(cfg) {
    const {
      data, selector, title,
      xKey, yKey, labelKey,
      xLabel, yLabel,
      extraKeys=[],
      xMin, xStep, yMin, yStep,
      width, height
    } = cfg;

    const m={top:30,right:20,bottom:40,left:50};
    const w=width-m.left-m.right, h=height-m.top-m.bottom;
    d3.select(selector).selectAll("svg").remove();

    const svg = d3.select(selector).append("svg")
        .attr("width",width).attr("height",height)
      .append("g")
        .attr("transform",`translate(${m.left},${m.top})`);

    svg.append("text")
      .attr("x",w/2).attr("y",-10)
      .attr("text-anchor","middle")
      .style("font-size","1rem")
      .text(title);

    const xs=data.map(d=>+d[xKey]), ys=data.map(d=>+d[yKey]);
    const x0=xMin!=null ? xMin : d3.min(xs), x1=d3.max(xs);
    const y0=yMin!=null ? yMin : d3.min(ys), y1=d3.max(ys);

    const xScale=d3.scaleLinear().domain([x0,x1]).nice().range([0,w]);
    const yScale=d3.scaleLinear().domain([y0,y1]).nice().range([h,0]);

    const xTicks=xStep!=null ? d3.range(x0,x1+xStep,xStep) : null;
    const yTicks=yStep!=null ? d3.range(
      yMin!=null ? y0 : Math.floor(y0),
      y1+yStep,
      yStep
    ) : null;

    const xAxis = xTicks ? d3.axisBottom(xScale).tickValues(xTicks) : d3.axisBottom(xScale);
    const yAxis = yTicks ? d3.axisLeft(yScale).tickValues(yTicks) : d3.axisLeft(yScale);

    svg.append("g").attr("transform",`translate(0,${h})`).call(xAxis);
    svg.append("g").call(yAxis);

    svg.append("text")
      .attr("x",w/2).attr("y",h+35)
      .attr("text-anchor","middle")
      .text(xLabel);

    svg.append("text")
      .attr("transform","rotate(-90)")
      .attr("x",-h/2).attr("y",-40)
      .attr("text-anchor","middle")
      .text(yLabel);

    svg.append("g").selectAll("circle")
      .data(data).join("circle")
        .attr("cx",d=>xScale(+d[xKey]))
        .attr("cy",d=>yScale(+d[yKey]))
        .attr("r",4)
        .style("opacity",0.7)
      .on("mouseover",(e,d)=>{
        let html=`<strong>${d[labelKey]}</strong><br/>
                  ${xLabel}: ${d[xKey]}<br/>
                  ${yLabel}: ${d[yKey].toFixed(2)}`;
        extraKeys.forEach(k=>{
          html+=`<br/>${k.replace("_"," ")}: ${d[k]}`;
        });
        tooltip.html(html).style("opacity",1);
      })
      .on("mousemove",e=>{
        tooltip.style("left",(e.pageX+10)+"px")
               .style("top",(e.pageY+10)+"px");
      })
      .on("mouseout",()=>tooltip.style("opacity",0));
  }
}
