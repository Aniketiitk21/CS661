// frontend/js/winners.js
export function drawTeamWinnersPie(
  containerSelector,
  apiEndpoint = "/api/team_winners"
) {
  const container = d3.select(containerSelector);
  container.html("");

  container
    .append("h2")
    .text("All-Time IPL Champions")
    .style("margin-bottom", "10px");

  const chartArea = container
    .append("div")
    .attr("class", "chart-area")
    .style("position", "relative");

  const tooltip = chartArea
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("display", "none")
    .style("padding", "6px")
    .style("background", "rgba(0,0,0,0.7)")
    .style("color", "#fff")
    .style("border-radius", "4px")
    .style("font-size", "12px");

  // ── preferred short labels for each team ────────────────────────────
  const SHORT = {
    "Chennai Super Kings": "CSK",
    "Mumbai Indians": "MI",
    "Kolkata Knight Riders": "KKR",
    "Rajasthan Royals": "RR",
    "Sunrisers Hyderabad": "SRH",
    "Royal Challengers Bengaluru": "RCB",
    "Punjab Kings": "PBKS",
    "Delhi Capitals": "DC",
    "Gujarat Titans": "GT",
    "Lucknow Super Giants": "LSG",
    "Deccan Chargers": "DC (old)",
    "Gujarat Lions": "GL",
    "Rising Pune Supergiant": "RPSG",
    "Pune Warriors": "PW",
    "Kochi Tuskers Kerala": "KTK"
  };

  const select = d3.select("#global-season-select");
  if (!select.empty()) select.on("change", fetchAndRender);

  fetchAndRender();

  /* ────────────────────────────────────────────────────────────────── */
  function fetchAndRender() {
    let years = "all";
    if (!select.empty()) {
      const chosen = Array.from(select.node().selectedOptions).map(o => o.value);
      years = chosen.includes("all") ? "all" : chosen.filter(y => y !== "all").join(",");
    }

    chartArea.html("<p>Loading…</p>");
    tooltip.style("display", "none");

    d3.json(`${apiEndpoint}?years=${encodeURIComponent(years)}`)
      .then(drawPie)
      .catch(err => {
        console.error("Error loading winners data:", err);
        chartArea.html("<p style='color:red'>Failed to load data; see console.</p>");
      });
  }

  /* ────────────────────────────────────────────────────────────────── */
  function drawPie(data) {
    chartArea.selectAll("*").remove();
    if (!data.length) {
      chartArea.append("p").text("No data available.");
      return;
    }

    const W = 400,
      H = 400,
      R = Math.min(W, H) / 2;

    const svg = chartArea
      .append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .append("g")
      .attr("transform", `translate(${W / 2},${H / 2})`);

    const color = d3
      .scaleOrdinal(d3.schemeCategory10)
      .domain(data.map(d => d.team));

    const pie = d3.pie().value(d => d.titles).sort(null);
    const arc = d3.arc().innerRadius(0).outerRadius(R - 10);

    const arcs = svg
      .selectAll("g.arc")
      .data(pie(data))
      .join("g")
      .attr("class", "arc");

    // ── slices ───────────────────────────────────────────────────────
    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data.team))
      .on("mouseover", (e, d) => {
        tooltip
          .style("display", "block")
          .html(
            `<strong>${d.data.team}</strong><br/>Titles: ${d.data.titles}<br/>Seasons: ${d.data.seasons.join(
              ", "
            )}`
          );
      })
      .on("mousemove", e => {
        tooltip
          .style("left", `${e.layerX + 10}px`)
          .style("top", `${e.layerY + 10}px`);
      })
      .on("mouseout", () => tooltip.style("display", "none"));

    // ── labels: short team names ─────────────────────────────────────
    arcs
      .append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", "11px")
      .style("fill", "#000")
      .text(d => SHORT[d.data.team] ?? d.data.team);
  }
}
