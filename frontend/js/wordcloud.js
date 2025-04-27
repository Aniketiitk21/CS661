// frontend/js/wordcloud.js
export function drawWordCloud(containerSelector, apiEndpoint = "/api/wordcloud") {
    const container = d3.select(containerSelector);
    container.html("");
  
    container.append("h2")
      .text("🌟 Top 25 Most Valuable Players")
      .style("margin-bottom","20px");
  
    const chartArea = container.append("div")
      .attr("class","chart-area")
      .style("position","relative")
      .style("width","100%")
      .style("height","250px");
  
    const tooltip = chartArea.append("div")
      .attr("class","tooltip")
      .style("position","absolute")
      .style("pointer-events","none")
      .style("display","none")
      .style("padding","2px")
      .style("background","rgba(0,0,0,0.7)")
      .style("color","#fff")
      .style("border-radius","4px")
      .style("font-size","12px");
  
    const select = d3.select("#global-season-select");
    if (select.empty()) {
      console.warn("⚠️  No global #global-season-select found for Word Cloud; defaulting to all seasons");
    } else {
      select.on("change", fetchAndRender);
    }
  
    fetchAndRender();
  
    async function fetchAndRender() {
      let yearsParam = "all";
      if (!select.empty()) {
        const chosen = Array.from(select.node().selectedOptions).map(o=>o.value);
        yearsParam = chosen.includes("all")?"all":chosen.filter(y=>y!=="all").join(",");
      }
  
      chartArea.html("<p>Loading…</p>");
      tooltip.style("display","none");
  
      try {
        const resp = await fetch(`${apiEndpoint}?years=${encodeURIComponent(yearsParam)}`);
        const text = await resp.text();
        let data;
        try { data = JSON.parse(text); } catch {}
        if (!resp.ok || data.error) {
          console.error("Wordcloud API error:", resp.status, text);
          chartArea.html(`<p style="color:red">Error ${resp.status}: ${data?.error||resp.statusText}</p>`);
          return;
        }
  
        chartArea.selectAll("*").remove();
        if (!d3.layout || typeof d3.layout.cloud !== "function") {
          return chartArea.append("p")
            .style("color","red")
            .text("Word-cloud plugin not loaded. Check your <script> includes.");
        }
        render(data);
      } catch (err) {
        console.error("Fetch failed:", err);
        chartArea.html("<p style='color:red'>Network error.</p>");
      }
    }
  
    function render(words) {
      const width  = chartArea.node().clientWidth;
      const height = chartArea.node().clientHeight;
    
      // 1) derive a size scale (sizes in your data → [14px .. 60px])
      const sizeExtent = d3.extent(words, d => d.size);
      const sizeScale  = d3.scaleLinear()
        .domain(sizeExtent)
        .range([14, 50]);  // min 14px, max 60px
    
      // 2) a color scale
      const colorScale = d3.scaleSequential()
      .domain(sizeExtent.reverse())         // largest→first, so they get the warmest tone
      .interpolator(d3.interpolateTurbo); // d3.interpolateRainbow); 
    
      // 3) layout
      const layout = d3.layout.cloud()
        .size([width, height])
        .words(words.map(d => ({ text: d.text, size: d.size })))
        .padding(2)
        .spiral("archimedean")            // ← switch from rectangular
        .rotate(() => Math.random()<0.5?0:90)
        .font("Impact")
        .fontSize(d => sizeScale(d.size))
        .on("end", draw)
      layout.start();
    
    
      // 4) draw callback
      function draw(placedWords) {
        const svg = chartArea.append("svg")
          .attr("width", width)
          .attr("height", height)
          .append("g")
            .attr("transform", `translate(${width/2},${height/2})`);
    
        const texts = svg.selectAll("text")
          .data(placedWords)
          .join("text")
            .attr("class","wtext")
            .style("font-family","Impact")
            .style("font-size","0px")                // start invisible
            //.style("fill", d => colorScale(d.text))
            .attr("text-anchor","middle")
            .attr("transform", d => 
               `translate(${d.x},${d.y})rotate(${d.rotate})`
            )
            .attr("fill", d => colorScale(d.size))
            .text(d => d.text);
    
        // 5) fade-in transition + grow font
        texts.transition()
          .duration(800)
          .style("font-size", d => `${d.size}px`)
          .style("opacity", 1);
    
        // 6) tooltip interactions
        texts
          .style("opacity", 0)
          .on("mouseover", (e,d) => {
            tooltip
              .style("display","block")
              .style("left", `${e.layerX+10}px`)
              .style("top",  `${e.layerY+10}px`)
              .html(`<strong>${d.text}</strong><br/>Value: ${d.size}`);
          })
          .on("mouseout", () => tooltip.style("display","none"));
      }
    }
    
  }
  