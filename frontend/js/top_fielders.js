export function drawTopFieldersChart(containerSelector, apiEndpoint = "/api/top_fielders") {
  const container = d3.select(containerSelector);
  container.html("");

  const tableArea = container.append("div")
    .attr("class","table-area");

  const select = d3.select("#global-season-select");
  if (!select.empty()) select.on("change", fetchAndRender);

  fetchAndRender();

  function fetchAndRender() {
    let yearsParam = "all";
    if (!select.empty()) {
      const chosen = Array.from(select.node().selectedOptions).map(o => o.value);
      yearsParam = chosen.includes("all") ? "all" : chosen.filter(y=>y!=="all").join(",");
    }

    tableArea.html("<p>Loading…</p>");
    d3.json(`${apiEndpoint}?years=${encodeURIComponent(yearsParam)}`)
      .then(data => renderTable(data))
      .catch(err => {
        console.error("Error loading fielders data:", err);
        tableArea.html("<p style='color:red'>Failed to load data; see console.</p>");
      });
  }

  function renderTable(data) {
    tableArea.html("");
    if (!data.length) {
      return tableArea.append("p").text("No data for these seasons.");
    }

    const table = tableArea.append("table")
      .attr("class", "stats-table")
      .style("width","100%");

    // header
    const thead = table.append("thead").append("tr");
    ["Fielder", "Attempts"].forEach(h =>
      thead.append("th").text(h)
    );

    // body
    const tbody = table.append("tbody");
    data.forEach(d => {
      const tr = tbody.append("tr");
      tr.append("td").text(d.fielder);
      tr.append("td").text(d.fielding_attempts);
    });
  }
}
