// frontend/js/win_prediction.js

export function drawWinPrediction(containerSelector, apiEndpoint = "/api/win_prediction") {
  // --- DEFAULT TEAM DATA ---
  const DEFAULT_TEAM1 = [
    "Virat Kohli", "AB de Villiers", "Faf du Plessis", "Devdutt Padikkal",
    "Glenn Maxwell", "Chris Morris", "Mohammed Siraj", "Yuzvendra Chahal",
    "Navdeep Saini", "Kyle Jamieson", "Harshal Patel"
  ];
  const DEFAULT_TEAM2 = [
    "Rohit Sharma", "Quinton de Kock", "Suryakumar Yadav", "Ishan Kishan",
    "Tilak Varma", "Hardik Pandya", "Kieron Pollard", "Jasprit Bumrah",
    "Trent Boult", "Rahul Chahar", "Kumar Kartikeya"
  ];

  // --- SETUP CONTAINER ---
  const container = d3.select(containerSelector).html(""); // Clear container

  // --- TEAM PANELS ROW ---
  const teamRow = container.append("div")
    .attr("class", "team-container") // Use class for styling
    // Removed inline styles, rely on CSS
    ;

  // Function to create a team input panel
  function makeTeamPanel(label, defaults) {
    const panel = teamRow.append("div")
      .attr("class", "team-panel"); // Use class for styling

    panel.append("h4").text(label); // Heading styled by CSS

    const list = panel.append("div")
        .attr("class", "player-list"); // Class for the list container

    defaults.forEach((name, i) => {
      const playerRow = list.append("div")
        .attr("class", "player-row"); // Use class for styling each row

      playerRow.append("input")
        .attr("type", "text")
        .attr("placeholder", `Player ${i + 1}`) // Add placeholder
        .attr("value", name)
        // Removed inline styles, rely on CSS
        ;

      playerRow.append("select")
        // Removed inline styles, rely on CSS
        .selectAll("option")
        .data(["Batsman", "All-Rounder", "Bowler"])
        .join("option")
          .attr("value", d => d) // Set value attribute
          .property("selected", d => {
            // Simplified role selection logic (adjust if needed)
            if (i >= 8) return d === "Bowler";         // Last 3 are bowlers
            if (i >= 5) return d === "All-Rounder";  // Players 6, 7, 8 are all-rounders
            return d === "Batsman";                  // First 5 are batsmen
          })
          .text(d => d);
    });
    // Return the container of the player inputs/selects for easy selection later
    return list;
  }

  // Create the two team panels
  const team1ListContainer = makeTeamPanel("Team 1", DEFAULT_TEAM1);
  const team2ListContainer = makeTeamPanel("Team 2", DEFAULT_TEAM2);

  // --- BUTTONS ROW ---
  const btnRow = container.append("div")
    .attr("class", "button-container"); // Use class for styling

  const btnSubmit = btnRow.append("button")
    // Removed inline styles, rely on CSS
    .text("Predict Winner"); // Changed text slightly

  const btnClear = btnRow.append("button")
    // Removed inline styles, rely on CSS
    .text("Clear Teams");

  // --- RESULTS AREA ---
  const resultArea = container.append("div")
    .attr("class", "chart-area") // Use class for styling
    // Removed inline styles, rely on CSS
    ;

  // --- EVENT LISTENERS ---

  // Clear Button Logic
  btnClear.on("click", () => {
    // Select inputs/selects within the list container for each team
    team1ListContainer.selectAll(".player-row").each(function() {
      d3.select(this).select("input").property("value", "");
      d3.select(this).select("select").property("value", "Batsman"); // Default to Batsman
    });
    team2ListContainer.selectAll(".player-row").each(function() {
        d3.select(this).select("input").property("value", "");
        d3.select(this).select("select").property("value", "Batsman"); // Default to Batsman
    });
    resultArea.html(""); // Clear results area
  });

  // Submit Button & Fetch Logic
  btnSubmit.on("click", async () => {
    // Helper function to gather data from inputs/selects within a list container
    const gatherPlayerData = (listContainer) => {
      return listContainer.selectAll(".player-row").nodes().map(row => ({
        name: row.querySelector("input").value.trim(),
        role: row.querySelector("select").value
      }));
    };

    const team1Data = gatherPlayerData(team1ListContainer);
    const team2Data = gatherPlayerData(team2ListContainer);

    // Basic validation: Check if all player names are filled
    if (team1Data.some(p => !p.name) || team2Data.some(p => !p.name)) {
      resultArea.html("<p class='error-message' style='color:red;text-align:center; font-weight: bold;'>Please enter names for all 11 players in both teams.</p>");
      return;
    }

    // Show loading indicator
    resultArea.html("<p class='loading-message' style='text-align:center; padding: 1rem; font-style: italic;'>Calculating prediction...</p>");

    try {
      // Prepare parameters for the API request
      const params = new URLSearchParams();
      params.append("team1", team1Data.map(p => p.name).join(","));
      params.append("roles1", team1Data.map(p => p.role).join(","));
      params.append("team2", team2Data.map(p => p.name).join(","));
      params.append("roles2", team2Data.map(p => p.role).join(","));

      // Fetch data from the API endpoint
      const resp = await fetch(`${apiEndpoint}?${params.toString()}`);
      const data = await resp.json();

      // Handle API errors
      if (!resp.ok) {
        // Try to get error message from API response, otherwise use status text
        throw new Error(data.error || `API Error: ${resp.status} ${resp.statusText}`);
      }

      // Render the results using the updated function
      renderResult(data);

    } catch (err) {
      console.error("Win Prediction API Fetch Error:", err);
      resultArea.html(`<p class='error-message' style='color:red;text-align:center; font-weight: bold;'>Prediction request failed: ${err.message}. Check console for details.</p>`);
    }
  });

  // --- RENDER RESULTS FUNCTION (UPDATED) ---
  // This function now uses CSS classes for styling the bars.
  function renderResult(data) {
    // Check if data structure is as expected
    if (!data || !data.team1 || !data.team2 || data.team1.prob === undefined || data.team2.prob === undefined) {
        console.error("Invalid data structure received from API:", data);
        resultArea.html("<p class='error-message' style='color:red;text-align:center; font-weight: bold;'>Received invalid data from prediction API.</p>");
        return;
    }

    const { team1: t1, team2: t2 } = data;
    // Helper to calculate percentage, defaulting to 50/50 if sum is 0
    const pct = (a, b) => { const s = a + b; return s > 0 ? (a / s * 100) : 50; };

    // Prepare data for bars: [Title, Team1 % (or raw prob), Team2 % (or raw prob)]
    // For sub-probabilities, we calculate percentage here.
    const barsData = [
      // Use raw probabilities for the main prediction
      ["Overall Win Probability", t1.prob, t2.prob],
      // Use calculated percentages for sub-categories
      // Add checks for existence of sub-scores
      ["Batting Strength", pct(t1.batting || 0, t2.batting || 0), pct(t2.batting || 0, t1.batting || 0)],
      ["Bowling Strength", pct(t1.bowling || 0, t2.bowling || 0), pct(t2.bowling || 0, t1.bowling || 0)],
      ["Fielding Strength", pct(t1.fielding || 0, t2.fielding || 0), pct(t2.fielding || 0, t1.fielding || 0)]
    ];

    resultArea.html(""); // Clear loading message/previous results

    // Create the results container with appropriate class
    const resultsContainer = resultArea.append("div")
      .attr("class", "results-display"); // Use this class for overall result styling

    // Add a title for the results section
    resultsContainer.append("h3")
        .attr("class", "results-title")
        .text("Win Prediction Breakdown");

    // Iterate through the prepared data to create each probability bar section
    barsData.forEach(([title, p1, p2]) => {
      // Ensure p1 and p2 are numbers
      p1 = Number(p1) || 0;
      p2 = Number(p2) || 0;

      // Normalize percentages if they don't add up to 100 (can happen with rounding or default 50/50)
      const totalP = p1 + p2;
      if (totalP > 0) {
          p1 = (p1 / totalP) * 100;
          p2 = (p2 / totalP) * 100;
      } else {
          p1 = 50;
          p2 = 50;
      }


      const section = resultsContainer.append("div")
        .attr("class", "prob-section"); // Class for each stat section

      section.append("h4")
        .attr("class", "prob-title") // Class for the title (e.g., "Overall Win Probability")
        .text(title);

      const barContainer = section.append("div")
        .attr("class", "prob-bar-container"); // Use the CSS class

      // Team 1 Label
      barContainer.append("span")
        .attr("class", "label label-team1") // Use CSS class
        .text(`Team 1: ${p1.toFixed(1)}%`); // Display percentage

      // Bar Wrapper
      const barWrapper = barContainer.append("div")
        .attr("class", "prob-bar-wrapper"); // Use CSS class

      // Team 1 Segment (Primary Color)
      barWrapper.append("div")
        .attr("class", "prob-segment prob-team1") // Use CSS classes
        .style("width", `${p1}%`); // Set width dynamically

      // Team 2 Segment (Secondary Color)
      barWrapper.append("div")
        .attr("class", "prob-segment prob-team2") // Use CSS classes
        .style("width", `${p2}%`); // Set width dynamically

      // Team 2 Label
      barContainer.append("span")
        .attr("class", "label label-team2") // Use CSS class
        .text(`${p2.toFixed(1)}% :Team 2`); // Display percentage
    });
  }

} // Closing brace for the main export function drawWinPrediction