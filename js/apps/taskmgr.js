/* Task Manager: shows the completed puzzle's result, explanation, sources and share text. */
(function (C) {
  var root, tabNow = 'result', copied = false;
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* Running averages from the sheet (players before you; refreshed each time the page loads). */
  function crowd() {
    var a = C.puzzle.stats;
    if (!a || !a.completed) return '';
    var pct = Math.round(100 * a.solved / a.completed);
    return '<div class="tm-box"><div class="tm-lbl">Everyone else so far</div><div class="small">' + a.completed + ' player' + (a.completed === 1 ? '' : 's') + ' finished · ' + pct + '% solved<br>' +
      'Average guesses: <b>' + a.avgGuesses.toFixed(1) + '</b> · Average time: <b>' + C.game.fmtTime(a.avgTimeSec * 1000) + '</b></div></div>';
  }

  function render() {
    var S = C.state.get(), P = C.game.puzzle, over = C.game.isOver();
    var tabs = ['result', 'explanation', 'sources'], names = { result: 'Result', explanation: 'Explanation', sources: 'Sources' };
    var head = '<div class="tm-tabs" role="tablist">' + tabs.map(function (t) {
      return '<button type="button" role="tab" class="tm-tab' + (t === tabNow ? ' on' : '') + '" data-tab="' + t + '" aria-selected="' + (t === tabNow) + '">' + names[t] + '</button>';
    }).join('') + '</div>';
    var body;
    if (!over) {
      body = '<div class="tm-lock"><div class="tm-big">Puzzle in progress</div><p>Results, the explanation and decisive sources unlock when you solve the puzzle or use all ' + C.game.max + ' guesses.</p>' +
        '<p class="small">Guesses used: ' + S.guesses.length + ' of ' + C.game.max + '<br>Time played: ' + C.game.fmtTime(S.elapsed) + '</p></div>';
    } else if (tabNow === 'result') {
      var solved = S.status === 'solved';
      body = '<div class="tm-panels"><div class="tm-graph ' + (solved ? 'ok' : 'bad') + '"><div class="tm-lbl">Outcome</div><div class="tm-big">' + (solved ? 'Solved' : 'Unsuccessful') + '</div></div>' +
        '<div class="tm-graph"><div class="tm-lbl">Guesses used</div><div class="tm-big">' + S.guesses.length + ' / ' + C.game.max + '</div></div>' +
        '<div class="tm-graph"><div class="tm-lbl">Time played</div><div class="tm-big">' + C.game.fmtTime(S.elapsed) + '</div></div></div>' +
        '<div class="tm-box"><div class="tm-lbl">Correct category</div><div><b>' + esc(C.game.categoryName(P.answer)) + '</b></div></div>' +
        crowd() +
        '<div class="tm-box"><div class="tm-lbl">Share your result (no spoilers)</div><pre class="tm-share">' + esc(C.game.shareText()) + '</pre>' +
        '<button type="button" class="xp-btn" data-act="copy">' + (copied ? 'Copied!' : 'Copy result') + '</button></div>';
    } else if (tabNow === 'explanation') {
      body = '<div class="tm-box"><div class="tm-lbl">' + esc(C.game.categoryName(P.answer)) + '</div><p>' + esc(P.result.explanation) + '</p></div>' +
        '<div class="tm-box"><div class="tm-lbl">Reusable verification tactic</div><p>' + esc(P.result.tactic) + '</p></div>';
    } else {
      body = '<div class="tm-box"><div class="tm-lbl">Decisive source content</div>' + P.result.decisive.map(function (d) {
        var pg = P.pages[d.page], seen = S.visited.indexOf(d.page) !== -1;
        return '<div class="tm-src"><a href="#" data-open="' + d.page + '">' + esc(pg.title) + '</a> <span class="muted small">' + esc(pg.site) + (seen ? ' · you viewed this' : ' · not viewed') + '</span><div class="small">' + esc(d.why) + '</div></div>';
      }).join('') + '</div>';
    }
    root.innerHTML = head + '<div class="tm-body">' + body + '</div>';
  }

  function build(body) {
    body.classList.add('tm'); root = body;
    body.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tab]'), c = e.target.closest('[data-act=copy]'), o = e.target.closest('[data-open]');
      if (t) { tabNow = t.getAttribute('data-tab'); render(); return; }
      if (o) { e.preventDefault(); C.browser.open(C.browser.routeFor(o.getAttribute('data-open'))); return; }
      if (c) {
        var txt = C.game.shareText();
        var done = function () { copied = true; render(); setTimeout(function () { copied = false; render(); }, 1800); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback);
        else fallback();
        function fallback() {
          var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } catch (err) { /* ignore */ }
          ta.remove(); done();
        }
      }
    });
    C.state.on(function (what) { if (what !== 'browse') render(); });
    render();
  }
  C.taskManager = { build: build };
})(window.Credible);
