/* Global namespace + configuration. The question itself comes from a spreadsheet (see data/questions.csv). */
window.Credible = {
  config: {
    // Which day to load. null = today's date; otherwise 'YYYY-MM-DD'. A ?date=YYYY-MM-DD URL parameter overrides this.
    puzzleDate: null,
    // Questions with no Date column are used one per day, in row order, starting on this date, then repeating.
    startDate: '2026-11-17',
    maxGuesses: 3,          // adjustable starting rule

    // Web app URL from the Google Sheet's script (sheets/Code.gs > Deploy > Web app). It both serves the day's question
    // and receives finished games to update the averages. Leave empty to play from the local file below.
    sheetUrl: '',
    // CSV copy of the same table. Used when sheetUrl is empty or unreachable. Needs http(s), not file://.
    localFile: 'data/questions.csv',

    // Page proxy (proxy/server.js). Most news sites refuse to be shown in an iframe; the proxy lets them load and records links the
    // player clicks inside them. If it is not running, the browser falls back to loading pages directly. '' = never use a proxy.
    proxyUrl: 'http://localhost:8787'
  }
};
