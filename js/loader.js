/* Loads the question of the day, then starts the app.
   One table, one row per question: Original Source | Information Distorders? | Reasoning | Credibility (1-5) | Reasoning | Supporting Clue ...
   Columns are found by their header text, so authors can add more "Supporting Clue" columns.
   Source: config.sheetUrl (Apps Script web app, returns that day's row) or config.localFile (a CSV of the same table). */
(function (C) {
  var cfg = C.config, BUILD = Date.now();
  var APP = ['js/state.js', 'js/stats.js', 'js/sound.js', 'js/icons.js', 'js/wm.js', 'js/apps/browser.js', 'js/apps/control.js',
    'js/apps/taskmgr.js', 'js/apps/widgets.js', 'js/apps/info.js', 'js/main.js'];

  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var str = function (v) { return v === undefined || v === null ? '' : String(v).trim(); };
  var num = function (v) { var n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : 0; };
  var key = function (s) { return str(s).toLowerCase().replace(/[^a-z0-9]/g, ''); };

  function today() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function wantedDate() {
    var m = /[?&]date=(\d{4}-\d{2}-\d{2})/.exec(location.search);
    return (m && m[1]) || cfg.puzzleDate || today();
  }
  function isoDate(v) { // tolerate Sheets turning 2026-11-17 into 11/17/2026
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str(v));
    return m ? m[3] + '-' + (m[1].length < 2 ? '0' : '') + m[1] + '-' + (m[2].length < 2 ? '0' : '') + m[2] : str(v);
  }
  var dayNumber = function (iso) { var p = iso.split('-'); return Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5); };

  /* Only real web addresses may be shown in the browser (never javascript:, data:, file: ...). */
  function safeUrl(u) {
    try { var x = new URL(str(u)); return (x.protocol === 'http:' || x.protocol === 'https:') ? x.href : null; } catch (e) { return null; }
  }
  function categoryId(v, what) {
    var k = key(v), c = C.categories.filter(function (x) { return key(x.id) === k || key(x.name) === k; })[0];
    if (!c) throw new Error('“' + str(v) + '” is not a category (' + what + '). Use: ' + C.categories.map(function (x) { return x.name; }).join('; ') + '.');
    return c.id;
  }

  /* ---------- table -> puzzle ---------- */
  /* table: array of rows (arrays of text), first row = headers. */
  function build(table, date) {
    var head = (table[0] || []).map(function (h) { return str(h).toLowerCase(); });
    var at = function (pred) { var o = []; head.forEach(function (h, i) { if (pred(h)) o.push(i); }); return o; };
    var col = {
      src: (at(function (h) { return h === 'original source' || h === 'source'; })[0]),
      dis: (at(function (h) { return h.indexOf('information') === 0 || h.indexOf('distorder') >= 0 || h.indexOf('disorder') >= 0; })[0]),
      why: at(function (h) { return h === 'reasoning'; }),
      cred: (at(function (h) { return h.indexOf('credibility') === 0; })[0]),
      clue: at(function (h) { return h.indexOf('supporting clue') === 0 || h === 'clue'; }),
      date: (at(function (h) { return h === 'date'; })[0]),
      done: at(function (h) { return h === 'players_completed'; })[0], solved: at(function (h) { return h === 'players_solved'; })[0],
      ag: at(function (h) { return h === 'avg_guesses'; })[0], at: at(function (h) { return h === 'avg_time_sec'; })[0]
    };
    var missing = ['src', 'dis', 'cred'].filter(function (k) { return col[k] === undefined; }).map(function (k) { return { src: 'Original Source', dis: 'Information Distorders?', cred: 'Credibility (1-5)' }[k]; });
    if (!col.why.length) missing.push('Reasoning');
    if (missing.length) throw new Error('The sheet is missing the column(s): ' + missing.join(', ') + '.');

    var rows = table.slice(1).filter(function (r) { return str(r[col.src]); });
    if (!rows.length) throw new Error('The sheet has no questions.');
    var r;
    if (col.date !== undefined && rows.some(function (x) { return str(x[col.date]); })) {
      var dated = rows.filter(function (x) { return str(x[col.date]); }).map(function (x) { x._d = isoDate(x[col.date]); return x; });
      r = dated.filter(function (x) { return x._d === date; })[0] ||
        dated.filter(function (x) { return x._d <= date; }).sort(function (a, b) { return a._d < b._d ? 1 : -1; })[0] ||
        dated.sort(function (a, b) { return a._d < b._d ? -1 : 1; })[0];
    } else {
      // no dates: one question per day, in order, starting on config.startDate and then repeating
      var n = rows.length, i = (dayNumber(date) - dayNumber(cfg.startDate || date)) % n;
      r = rows[(i + n) % n];
    }
    var cell = function (i) { return i === undefined ? '' : str(r[i]); };

    var source = safeUrl(cell(col.src));
    if (!source) throw new Error('“Original Source” is not a web address: ' + cell(col.src));
    var answers = [];
    cell(col.dis).split(/[,;\n]/).forEach(function (p) { if (str(p)) { var id = categoryId(p, 'Information Distorders?'); if (answers.indexOf(id) < 0) answers.push(id); } });
    if (!answers.length) throw new Error('This question has no category in “Information Distorders?”.');
    var clues = [];
    col.clue.forEach(function (i) {
      var raw = str(r[i]); if (!raw) return;
      var u = safeUrl(raw);
      if (!u) { console.warn('Skipping a clue that is not a web address: ' + raw); return; }
      if (u !== source && clues.indexOf(u) < 0) clues.push(u);
    });
    var score = Math.max(1, Math.min(5, Math.round(num(cell(col.cred))) || 0));
    var day = r._d || date;
    return {
      id: day, date: day, question: source, source: source,
      answers: answers, answer: answers[0],
      explanation: cell(col.why[0]),
      credibility: { score: num(cell(col.cred)) ? score : 0, why: col.why[1] === undefined ? '' : cell(col.why[1]) },
      clues: clues,
      stats: { completed: num(cell(col.done)), solved: num(cell(col.solved)), avgGuesses: num(cell(col.ag)), avgTimeSec: num(cell(col.at)) }
    };
  }

  /* ---------- fetching ---------- */
  function fetchText(url) {
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error(url + ' returned HTTP ' + res.status);
      return res.text();
    });
  }
  function fromSheet(date) {
    var u = cfg.sheetUrl + (cfg.sheetUrl.indexOf('?') < 0 ? '?' : '&') + 'date=' + date + '&start=' + encodeURIComponent(cfg.startDate || '');
    return fetchText(u).then(function (t) {
      var d; try { d = JSON.parse(t); } catch (e) { throw new Error('The sheet web app did not return data (is it deployed with access “Anyone”?).'); }
      if (d.error) throw new Error('Sheet: ' + d.error);
      return d.table;
    });
  }
  function fromFile() { return fetchText(cfg.localFile).then(function (x) { return C.csv.parse(x); }); }
  function load() {
    var date = wantedDate();
    var src = cfg.sheetUrl ? fromSheet(date).catch(function (e) { if (!cfg.localFile) throw e; console.warn(e.message + ' Using the local file.'); return fromFile(); }) : fromFile();
    return src.then(function (table) { return build(table, date); });
  }

  /* ---------- boot ---------- */
  function show(msg) {
    var b = document.getElementById('boot'); if (!b) return;
    b.hidden = false; b.innerHTML = msg;
  }
  function inject(list, done) {
    var s = list.shift(); if (!s) return done();
    var el = document.createElement('script'); el.src = s + '?v=' + BUILD; // never run a stale cached copy
    el.onload = function () { inject(list, done); };
    el.onerror = function () { show('<b>Could not load ' + s + '</b>'); };
    document.body.appendChild(el);
  }

  show('Loading today’s question…');
  load().then(function (p) {
    C.puzzle = p;
    inject(APP.slice(), function () { document.getElementById('boot').hidden = true; });
  }, function (e) {
    var file = location.protocol === 'file:';
    show('<b>Couldn’t load the question of the day.</b><p>' + esc(e.message) + '</p>' +
      (file ? '<p>Browsers block reading local files from a <code>file://</code> page. Set <code>sheetUrl</code> in <code>data/config.js</code>, or serve this folder, e.g. <code>python -m http.server</code>, and open <code>http://localhost:8000</code>.</p>' : ''));
  });
})(window.Credible);
