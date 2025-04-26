// frontend/js/seasonsDropdown.js
export function createSeasonsDropdown(parent) {
    // 1) Label
    parent.append("label")
      .attr("for", "seasons-dropdown")
      .text("Seasons:");
  
    // 2) Dropdown wrapper
    const seasonDropdown = parent.append("div")
      .attr("class", "custom-dropdown")
      .attr("id", "seasons-dropdown");
  
    const seasonToggle = seasonDropdown.append("button")
      .attr("type", "button")
      .attr("class", "dropdown-toggle")
      .text("All");
  
    const seasonMenu = seasonDropdown.append("div")
      .attr("class", "dropdown-menu");
  
    // 3) Add years
    const yearsArr = Array.from({ length: 2024 - 2008 + 1 }, (_, i) => String(2008 + i));
    ["all", ...yearsArr].forEach(year => {
      const label = seasonMenu.append("label");
      label.append("input")
        .attr("type", "checkbox")
        .attr("value", year)
        .property("checked", year === "all");
      label.append("span").text(year);
    });
  
    // 4) Toggle open/close
    seasonToggle.on("click", () => {
      seasonDropdown.classed("open", !seasonDropdown.classed("open"));
    });
  
    // 5) Close if click outside
    d3.select("body").on("click", (e) => {
      if (!seasonDropdown.node().contains(e.target)) {
        seasonDropdown.classed("open", false);
      }
    });
  
    // 6) Handle selection
    seasonMenu.selectAll("input").on("change", function () {
      const checked = seasonMenu.selectAll("input").nodes()
        .filter(n => n.checked).map(n => n.value);
      if (checked.includes("all")) {
        seasonToggle.text("All");
        seasonMenu.selectAll("input").property("checked", d => d3.select(this).node().value === "all");
      } else {
        seasonToggle.text(checked.join(", "));
        seasonMenu.select("input[value='all']").property("checked", false);
      }
    });
    // 7) Return helper function to get selected seasons
    return {
      getSelectedSeasons: () => {
        const checked = seasonMenu.selectAll("input").nodes()
          .filter(n => n.checked).map(n => n.value);
        if (checked.includes("all")) return ["all"];
        return checked;
      }
    };
  }
  