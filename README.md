# 🏏 IPL Data Visualization Dashboard (2008–2024)

**Team 16 | CS661 Project | IIT Kanpur**

This project presents an interactive data visualization system for the Indian Premier League (IPL), covering matches from 2008 to 2024. The system enables users to explore team performances, player statistics, and seasonal trends with insightful analytics and predictive capabilities.

## 📌 Project Objectives

- Enable users to analyze IPL data through interactive dashboards and visualizations.
- Support deep dives into player stats, team matchups, and season-wide trends.
- Provide predictive insights using custom scoring systems and win probability modeling.

## 📊 Dataset

- **Source**: Kaggle IPL Complete Dataset (2008–2024), originally compiled by Cricsheet.
- **Data Includes**: Match summaries, ball-by-ball data, player stats, and team details.

## ⚙️ Tech Stack

- **Backend**: Python, Flask
- **Frontend**: D3.js, HTML/CSS, JavaScript
- **Data Processing**: Pandas, NumPy
- **Storage**: Precomputed aggregates in JSON/CSV format

## 🧹 Data Processing

- Cleaned inconsistencies in team/player names and date formats.
- Standardized data structure and calculated cricket-specific metrics:
  - Batting Strike Rate = (Runs Scored / Balls Faced) × 100
  - Bowling Economy Rate = (Runs Conceded / Overs Bowled)

## 📈 Features

### Dashboards

- **Stats Dashboard**: Overview of IPL-wide stats with interactive filters.
- **Team & Player Dashboards**: Visual insights into performances across seasons.
- **Head-to-Head Analysis**: Comparative stats between any two teams.
- **Prediction Dashboard**: Win probabilities based on calculated scores.

### Visualizations

- Bar Charts, Line Graphs, Scatter Plots, Word Clouds
- Interactive filtering by team, player, and season
- Smooth transitions, tooltips, and zoom capabilities

## 🔮 Advanced Analytics

- **Scoring System**:
  - Batting Points = runs + (4s × 4) + (6s × 6)
  - Bowling Points = dot balls × 1 + wickets × 30 + lbw/bowled × 8
  - Fielding Points = catches×8 + stumpings×12 + run outs×6 + bonus for 3+ catches
- **Career Metrics**: Match-wise and seasonal averages
- **Win Probability**: Calculated using total team points:  
  `Win % = Team A Score / (Team A Score + Team B Score) × 100`

## 🧠 Insights

- Identify top performers across seasons
- Analyze team strategies for home/away, chasing/defending
- Track Orange Cap and Purple Cap winners
- Observe trends in scoring, dismissals, and match outcomes

## 👥 Target Audience

Cricket analysts, fantasy league players, IPL fans, and data enthusiasts.

## 🚀 Running the App Locally

```bash
# Clone the repository
git clone https://github.com/yourusername/ipl-dashboard.git
cd ipl-dashboard

# Install dependencies
pip install -r requirements.txt

# Run the Flask app
python app.py
