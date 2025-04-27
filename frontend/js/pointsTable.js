//  frontend/js/pointsTable.js
export function drawPointsTable(
  containerSelector,
  apiEndpoint = "/api/points_table"
) {
  const container = d3.select(containerSelector);
  container.html("");

  /* ------------------------------------------------------------- TOOLTIP */
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("padding", "6px 10px")
    .style("background", "rgba(0,0,0,0.7)")
    .style("color", "#fff")
    .style("border-radius", "4px")
    .style("font-size", "0.85rem")
    .style("opacity", 0);

  /* ------------------------------------------------------------- CONTROLS */
  const ctrl = container
    .append("div")
    .attr("class", "controls")
    .style("display", "flex")
    .style("gap", "10px")
    .style("align-items", "center")
    .style("margin-bottom", "10px");

  ctrl.append("label").attr("for", "points-year-select").text("Season:");
  const select = ctrl
    .append("select")
    .attr("id", "points-year-select")
    .style("padding", "6px 8px");

  const years = Array.from(
    { length: 2024 - 2008 + 1 },
    (_, i) => String(2008 + i)
  );
  select
    .selectAll("option")
    .data(years)
    .join("option")
    .attr("value", (d) => d)
    .text((d) => d);
  select.property("value", years.at(-1));

  ctrl
    .append("button")
    .text("Show Stats")
    .style("padding", "6px 12px")
    .on("click", fetchAndRender);

  /* ------------------------------------------------------------- RESULT WRAPPER */
  const resultArea = container
    .append("div")
    .attr("class", "chart-area")
    .style("margin-top", "20px");

  fetchAndRender(); // initial load

  /* ==================================================== MAIN FETCH / RENDER */
  async function fetchAndRender() {
    const year = select.property("value");
    resultArea.html("<p>Loading…</p>");

    try {
      /* 1 ) points table */
      const ptsResp = await fetch(`${apiEndpoint}?year=${year}`);
      const ptsText = await ptsResp.text();
      const ptsTable = JSON.parse(ptsText.replace(/\bNaN\b/g, "null"));

      /* 2 ) scatter-plot data (no more summary fetch) */
      const [bats, bowl] = await Promise.all([
        fetch(`/api/batsmen_scatter_data?years=${year}`).then((r) => r.json()),
        fetch(`/api/bowlers_scatter_data?years=${year}`).then((r) => r.json()),
      ]);

      /* 3 ) render */
      resultArea.html("");
      renderTable(ptsTable);
      renderScatters(bats, bowl);
    } catch (err) {
      console.error(err);
      resultArea.html(
        "<p style='color:red'>Request failed – check the console.</p>"
      );
    }
  }

  /* ------------------------------------------------------------- POINTS TABLE */
  function renderTable(rows) {
    if (!rows.length) {
      resultArea.append("p").text("No points data for this season.");
      return;
    }
    const tbl = resultArea
      .append("table")
      .attr("class", "stats-table")
      .style("width", "100%")
      .style("border-collapse", "collapse")
      .style("margin-bottom", "20px");

    const thead = tbl.append("thead").append("tr");
    ["Team", "Pld", "W", "L", "NR", "Pts", "NRR"].forEach((h) =>
      thead
        .append("th")
        .text(h)
        .style("padding", "6px 8px")
        .style("border-bottom", "2px solid #ccc")
    );

    const tbody = tbl.append("tbody");
    rows.forEach((r) => {
      const tr = tbody.append("tr");
      [
        "team",
        "matches_played",
        "wins",
        "losses",
        "no_result",
        "points",
        "nrr",
      ].forEach((k) => {
        const val =
          k === "nrr" ? (r[k] == null ? "–" : r[k].toFixed(3)) : r[k];
        tr.append("td").text(val);
      });
      tr.selectAll("td")
        .style("padding", "6px 8px")
        .style("border-bottom", "1px solid #eee");
    });
  }

  /* ------------------------------------------------------------- SCATTERS */
  function renderScatters(batsData, bowlData) {
    const row = resultArea
      .append("div")
      .style("display", "flex")
      .style("justify-content", "space-between")
      .style("gap", "20px")
      .style("margin-top", "40px");

    const W = 500,
      H = 350;

    row
      .append("div")
      .attr("id", "bats-scatter")
      .style("width", "48%")
      .style("height", H + "px");

    row
      .append("div")
      .attr("id", "bowl-scatter")
      .style("width", "48%")
      .style("height", H + "px");

    drawScatter({
      data: batsData,
      selector: "#bats-scatter",
      title: "Top 50 Batsmen",
      xKey: "runs",
      yKey: "strike_rate",
      labelKey: "batter",
      xLabel: "Runs",
      yLabel: "Strike Rate",
      extraKeys: ["sixes", "fours"],
      xMin: 100,
      xStep: 50,
      width: W,
      height: H,
      dotColor: "#3b6db3",
    });

    drawScatter({
      data: bowlData,
      selector: "#bowl-scatter",
      title: "Top 50 Bowlers",
      xKey: "wickets",
      yKey: "economy_rate",
      labelKey: "bowler",
      xLabel: "Wickets",
      yLabel: "Economy Rate",
      extraKeys: ["dot_balls"],
      yStep: 1,
      width: W,
      height: H,
      dotColor: "#f28e2b",
    });
  }

  /* ------------------------------------------------------------- GENERIC DRAWER */
  function drawScatter(cfg) {
    const {
      data,
      selector,
      title,
      xKey,
      yKey,
      labelKey,
      xLabel,
      yLabel,
      extraKeys = [],
      xMin,
      xStep,
      yMin,
      yStep,
      width,
      height,
      dotColor = "#4062a1",
    } = cfg;

    const m = { top: 40, right: 20, bottom: 45, left: 55 },
      w = width - m.left - m.right,
      h = height - m.top - m.bottom;

    d3.select(selector).selectAll("svg").remove();

    const svg = d3
      .select(selector)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${m.left},${m.top})`);

    /* title */
    svg
      .append("text")
      .attr("x", w / 2)
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .style("font-size", "1rem")
      .style("font-weight", "600")
      .text(title);

    /* scales & axes */
    const xs = data.map((d) => +d[xKey]),
      ys = data.map((d) => +d[yKey]);
    const x0 = xMin ?? d3.min(xs),
      x1 = d3.max(xs);
    const y0 = yMin ?? d3.min(ys),
      y1 = d3.max(ys);

    const x = d3.scaleLinear().domain([x0, x1]).nice().range([0, w]);
    const y = d3.scaleLinear().domain([y0, y1]).nice().range([h, 0]);

    const xAxis = d3.axisBottom(x).tickValues(
      xStep ? d3.range(x0, x1 + xStep, xStep) : undefined
    );
    const yAxis = d3.axisLeft(y).tickValues(
      yStep
        ? d3.range(yMin != null ? y0 : Math.floor(y0), y1 + yStep, yStep)
        : undefined
    );

    svg.append("g").attr("transform", `translate(0,${h})`).call(xAxis);
    svg.append("g").call(yAxis);

    /* axis labels */
    svg
      .append("text")
      .attr("x", w / 2)
      .attr("y", h + 35)
      .attr("text-anchor", "middle")
      .style("font-size", "0.85rem")
      .text(xLabel);

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -h / 2)
      .attr("y", -42)
      .attr("text-anchor", "middle")
      .style("font-size", "0.85rem")
      .text(yLabel);

    /* dots */
    svg
      .append("g")
      .selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", (d) => x(+d[xKey]))
      .attr("cy", (d) => y(+d[yKey]))
      .attr("r", 4.5)
      .style("fill", dotColor)
      .style("stroke", "#fff")
      .style("stroke-width", 0.8)
      .style("opacity", 0.85)
      .on("mouseover", (e, d) => {
        let html = `<strong>${d[labelKey]}</strong><br/>${xLabel}: ${
          d[xKey]
        }<br/>${yLabel}: ${(+d[yKey]).toFixed(2)}`;
        extraKeys.forEach(
          (k) => (html += `<br/>${k.replace("_", " ")}: ${d[k]}`)
        );
        tooltip.html(html).style("opacity", 1);
      })
      .on("mousemove", (e) =>
        tooltip
          .style("left", e.pageX + 12 + "px")
          .style("top", e.pageY + 12 + "px")
      )
      .on("mouseout", () => tooltip.style("opacity", 0));
  }
}
