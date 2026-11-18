/* Global namespace + configuration. The question itself comes from a spreadsheet row (see data/puzzles.csv). */
window.Credible = {
  config: {
    // Which day's question to load. null = today's date; otherwise 'YYYY-MM-DD'. A ?date=YYYY-MM-DD URL parameter overrides this.
    puzzleDate: null,
    maxGuesses: 3,          // adjustable starting rule

    // Web app URL from the Google Sheet's script (sheets/Code.gs > Deploy > Web app). It both serves the day's rows
    // and receives finished games to update the averages. Leave empty to play from the local file below.
    sheetUrl: '',
    // CSV copy of the same table. Used when sheetUrl is empty or unreachable. Needs http(s), not file://.
    localFile: 'data/question.csv'
  }
};
