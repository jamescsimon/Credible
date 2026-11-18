/**
 * Credible: Google Apps Script for the question-of-the-day spreadsheet.
 * Deploy: Extensions > Apps Script > paste this > Deploy > New deployment > Web app
 *         (Execute as: Me, Who has access: Anyone) > copy the /exec URL into data/config.js as sheetUrl.
 *
 * ONE tab named "question". First row = headers (see data/question.csv). Every row has a date and a part.
 *
 * doGet  ?date=YYYY-MM-DD  -> that day's rows only (other days, i.e. future answers, are never sent).
 * doPost {date, guesses, seconds, solved} -> updates the statistics columns on that day's "answer" row:
 *     players_completed + 1, and each average moves by one more sample:  new_avg = (old_avg * n + x) / (n + 1)
 */
var TAB = 'question';
var MAX_GUESSES = 3;          // keep in step with data/config.js
var MAX_SECONDS = 6 * 3600;   // ignore absurd times (a tab left open overnight)

function doGet(e) {
  try {
    var wanted = String((e && e.parameter && e.parameter.date) || '');
    var rows = readRows_();
    // same rule as the page: today's row, else the latest earlier day, else the earliest
    var days = rows.filter(function (r) { return partOf_(r) === 'answer'; }).map(function (r) { return r.date; }).filter(String).sort();
    var day = days.indexOf(wanted) >= 0 ? wanted : (days.filter(function (d) { return d <= wanted; }).pop() || days[0]);
    return reply_({ rows: rows.filter(function (r) { return r.date === day; }) });
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

    var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(TAB), tz = ss.getSpreadsheetTimeZone();
    var values = sh.getDataRange().getValues();
    var col = {}; values[0].forEach(function (h, i) { col[String(h).trim()] = i; });
    var row = -1;
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][col.part]).trim().toLowerCase() === 'answer' && cellText_(values[r][col.date], tz) === String(d.date)) { row = r; break; }
    }
    if (row < 0) return reply_({ ok: false, error: 'no answer row for that date' });

    var n = Number(values[row][col.players_completed]) || 0;
    var solved = Number(values[row][col.players_solved]) || 0;
    var avgG = Number(values[row][col.avg_guesses]) || 0;
    var avgT = Number(values[row][col.avg_time_sec]) || 0;

    set_(sh, row, col.players_completed, n + 1);
    set_(sh, row, col.players_solved, solved + (d.solved ? 1 : 0));
    set_(sh, row, col.avg_guesses, round_((avgG * n + guesses) / (n + 1)));
    set_(sh, row, col.avg_time_sec, round_((avgT * n + seconds) / (n + 1)));
    return reply_({ ok: true, completed: n + 1 });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** The whole tab as a list of {header: text} rows. Dates become YYYY-MM-DD; blank rows are skipped. */
function readRows_() {
  var ss = SpreadsheetApp.getActive(), tz = ss.getSpreadsheetTimeZone(), sh = ss.getSheetByName(TAB);
  if (!sh) throw new Error('No tab named "' + TAB + '".');
  var v = sh.getDataRange().getValues(), head = v.shift().map(function (h) { return String(h).trim(); });
  return v.filter(function (r) { return r.join('') !== ''; }).map(function (r) {
    var o = {}; head.forEach(function (h, i) { if (h) o[h] = cellText_(r[i], tz); }); return o;
  });
}
function partOf_(r) { return String(r.part || '').trim().toLowerCase(); }
function cellText_(v, tz) { return v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : String(v); }
function set_(sh, rowIdx, colIdx, v) { sh.getRange(rowIdx + 1, colIdx + 1).setValue(v); }
function round_(x) { return Math.round(x * 100) / 100; }
function reply_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
