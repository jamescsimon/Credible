/**
 * Credible: Google Apps Script for the question spreadsheet.
 * Deploy: Extensions > Apps Script > paste this > Deploy > New deployment > Web app
 *         (Execute as: Me, Who has access: Anyone) > copy the /exec URL into data/config.js as sheetUrl.
 *
 * ONE tab named "questions", one row per question (see data/questions.csv). Headers are found by name:
 *   Original Source | Information Distorders? | Reasoning | Credibility (1-5) | Reasoning | Supporting Clue ...
 *   and, at the right, players_completed | players_solved | avg_guesses | avg_time_sec  (added automatically if missing)
 *
 * doGet  ?date=YYYY-MM-DD&start=YYYY-MM-DD -> the header row plus ONLY that day's question (other answers are never sent).
 *        With a "Date" column the row dated that day (else the latest earlier) is used; without one, questions are used
 *        one per day in row order starting on `start`, then repeat. Same rule as the page.
 * doPost {question, guesses, seconds, solved} -> updates the statistics on the row whose Original Source is `question`:
 *        players_completed + 1, and each average moves by one more sample:  new_avg = (old_avg * n + x) / (n + 1)
 */
var TAB = 'questions';
var MAX_GUESSES = 3;          // keep in step with data/config.js
var MAX_SECONDS = 6 * 3600;   // ignore absurd times (a tab left open overnight)
var STATS = ['players_completed', 'players_solved', 'avg_guesses', 'avg_time_sec'];

function doGet(e) {
  try {
    var date = String((e && e.parameter && e.parameter.date) || '');
    var start = String((e && e.parameter && e.parameter.start) || date);
    var t = readTable_(), head = t.head, rows = t.rows;
    var iSrc = idx_(head, function (h) { return h === 'original source' || h === 'source'; });
    var iDate = idx_(head, function (h) { return h === 'date'; });
    rows = rows.filter(function (r) { return String(r[iSrc]).trim() !== ''; });
    if (!rows.length) return reply_({ error: 'no questions' });
    var row;
    if (iDate >= 0 && rows.some(function (r) { return r[iDate] !== ''; })) {
      var dated = rows.filter(function (r) { return r[iDate] !== ''; }).sort(function (a, b) { return a[iDate] < b[iDate] ? -1 : 1; });
      row = dated.filter(function (r) { return r[iDate] === date; })[0] || dated.filter(function (r) { return r[iDate] <= date; }).pop() || dated[0];
    } else {
      var n = rows.length, i = (dayNumber_(date) - dayNumber_(start)) % n;
      row = rows[(i + n) % n];
    }
    return reply_({ table: [head].concat([row]) });
  } catch (err) {
    return reply_({ error: String(err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);                       // two players finishing at once must not overwrite each other
  try {
    var d = JSON.parse(e.postData.contents);
    var guesses = Number(d.guesses), seconds = Number(d.seconds);
    if (!(guesses >= 1 && guesses <= MAX_GUESSES) || !(seconds >= 0)) return reply_({ ok: false, error: 'bad input' });
    seconds = Math.min(seconds, MAX_SECONDS);

    var sh = SpreadsheetApp.getActive().getSheetByName(TAB);
    var values = sh.getDataRange().getValues();
    var head = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
    var iSrc = idx_(head, function (h) { return h === 'original source' || h === 'source'; });
    STATS.forEach(function (name) {              // add any missing statistics columns at the right
      if (head.indexOf(name) < 0) { sh.getRange(1, head.length + 1).setValue(name); head.push(name); }
    });
    var col = {}; STATS.forEach(function (n) { col[n] = head.indexOf(n); });
    var row = -1;
    for (var r = 1; r < values.length; r++) { if (String(values[r][iSrc]).trim() === String(d.question).trim()) { row = r; break; } }
    if (row < 0) return reply_({ ok: false, error: 'question not found' });

    var cell = function (n) { return Number(values[row][col[n]]) || 0; };
    var n0 = cell('players_completed');
    set_(sh, row, col.players_completed, n0 + 1);
    set_(sh, row, col.players_solved, cell('players_solved') + (d.solved ? 1 : 0));
    set_(sh, row, col.avg_guesses, round_((cell('avg_guesses') * n0 + guesses) / (n0 + 1)));
    set_(sh, row, col.avg_time_sec, round_((cell('avg_time_sec') * n0 + seconds) / (n0 + 1)));
    return reply_({ ok: true, completed: n0 + 1 });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** The tab as text: {head: [lower-case headers], rows: [[text]]}. Dates become YYYY-MM-DD. */
function readTable_() {
  var ss = SpreadsheetApp.getActive(), tz = ss.getSpreadsheetTimeZone(), sh = ss.getSheetByName(TAB);
  if (!sh) throw new Error('No tab named "' + TAB + '".');
  var v = sh.getDataRange().getValues();
  var rawHead = v.shift().map(function (h) { return String(h).trim(); });
  var rows = v.filter(function (r) { return r.join('') !== ''; }).map(function (r) {
    return r.map(function (c) { return c instanceof Date ? Utilities.formatDate(c, tz, 'yyyy-MM-dd') : String(c); });
  });
  return { head: rawHead, rows: rows };
}
function idx_(head, pred) { for (var i = 0; i < head.length; i++) { if (pred(String(head[i]).trim().toLowerCase())) return i; } return -1; }
function dayNumber_(iso) { var p = String(iso).split('-'); return Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5); }
function set_(sh, rowIdx, colIdx, v) { sh.getRange(rowIdx + 1, colIdx + 1).setValue(v); }
function round_(x) { return Math.round(x * 100) / 100; }
function reply_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
