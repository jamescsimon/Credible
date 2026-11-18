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

    // Page proxies. Most news sites refuse to be shown in an iframe; a proxy lets them load and records links the player clicks
    // inside them. If no proxy is reachable the browser falls back to loading pages directly (sites that block framing stay blank).
    localProxyUrl: 'http://localhost:8787',   // used only when the game is opened from localhost (node proxy/server.js)
    proxyUrl: 'https://credible.swaggysimon24.workers.dev'   // hosted proxy for GitHub Pages etc.: your Cloudflare Worker, e.g. 'https://credible.YOURNAME.workers.dev'
  }
};
