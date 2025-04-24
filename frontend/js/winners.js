// frontend/js/winners.js
export function drawTeamWinnersPie(containerSelector, apiEndpoint = "/api/team_winners") {
    const container = d3.select(containerSelector);
    container.html("");
  
    container.append("h2")
      .text("All-Time IPL Champions")
      .style("margin-bottom","10px");
  
    const chartArea = container.append("div")
      .attr("class","chart-area")
      .style("position","relative");
  
    const tooltip = chartArea.append("div")
      .attr("class","tooltip")
      .style("position","absolute")
      .style("pointer-events","none")
      .style("display","none")
      .style("padding","6px")
      .style("background","rgba(0,0,0,0.7)")
      .style("color","#fff")
      .style("border-radius","4px")
      .style("font-size","12px");
  
    const select = d3.select("#global-season-select");
    if (select.empty()) {
      console.warn("⚠️  No global #global-season-select found for Champions pie; defaulting to all seasons");
    } else {
      select.on("change", fetchAndDraw);
    }
  
    fetchAndDraw();
  
    function fetchAndDraw() {
      let yearsParam = "all";
      if (!select.empty()) {
        const chosen = Array.from(select.node().selectedOptions).map(o=>o.value);
        yearsParam = chosen.includes("all")?"all":chosen.filter(y=>y!=="all").join(",");
      }
  
      chartArea.html("<p>Loading…</p>");
      tooltip.style("display","none");
  
      d3.json(`${apiEndpoint}?years=${encodeURIComponent(yearsParam)}`)
        .then(data => drawPie(data))
        .catch(err => {
          console.error("Error loading winners data:", err);
          chartArea.html("<p style='color:red'>Failed to load data; see console.</p>");
        });
    }
  
    function drawPie(data) {
      chartArea.selectAll("*").remove();
      if (!data.length) {
        return chartArea.append("p").text("No data available.");
      }
  
      const width  = 400, height = 400, radius = Math.min(width,height)/2;
      const svg = chartArea.append("svg")
        .attr("viewBox",`0 0 ${width} ${height}`)
        .append("g")
          .attr("transform",`translate(${width/2},${height/2})`);
  
      const color = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(data.map(d=>d.team));
  
      const pie = d3.pie().value(d=>d.titles).sort(null);
      const arc = d3.arc().innerRadius(0).outerRadius(radius-10);
  
      const arcs = svg.selectAll("g.arc")
        .data(pie(data))
        .join("g")
          .attr("class","arc");
  
      arcs.append("path")
        .attr("d", arc)
        .attr("fill", d=> color(d.data.team))
        .on("mouseover", (e,d)=>{
          tooltip
            .style("display","block")
            .html(`<strong>${d.data.team}</strong><br/>Titles: ${d.data.titles}<br/>Seasons: ${d.data.seasons.join(", ")}`);
        })
        .on("mousemove", (e)=> {
          tooltip
            .style("left", `${e.layerX+10}px`)
            .style("top",  `${e.layerY+10}px`);
        })
        .on("mouseout", ()=> tooltip.style("display","none"));
  
      arcs.append("text")
        .attr("transform", d=>`translate(${arc.centroid(d)})`)
        .attr("text-anchor","middle")
        .style("font-size","10px")
        .text(d=>d.data.titles);
    }
  }
  