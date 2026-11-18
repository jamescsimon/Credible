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

  function label(u) {
    try { var x = new URL(u), p = x.pathname === '/' ? '' : x.pathname.replace(/\/$/, ''), t = x.hostname.replace(/^www\./, '') + p; return t.length > 52 ? t.slice(0, 49) + '…' : t; } catch (e) { return u; }
  }

  function render() {
    var S = C.state.get(), P = C.game.puzzle, over = C.game.isOver();
    var tabs = ['result', 'explanation', 'sources'], names = { result: 'Result', explanation: 'Explanation', sources: 'Sources' };
    var head = '<div class="tm-tabs" role="tablist">' + tabs.map(function (t) {
      return '<button type="button" role="tab" class="tm-tab' + (t === tabNow ? ' on' : '') + '" data-tab="' + t + '" aria-selected="' + (t === tabNow) + '">' + names[t] + '</button>';
    }).join('') + '</div>';
    var body;
    if (!over) {
      body = '<div class="tm-lock"><div class="tm-big">Puzzle in progress</div><p>Results, the explanation and the sources unlock when you solve the puzzle or use all ' + C.game.max + ' guesses.</p>' +
        '<p class="small">Guesses used: ' + S.guesses.length + ' of ' + C.game.max + '<br>Time played: ' + C.game.fmtTime(S.elapsed) + '</p></div>';
    } else if (tabNow === 'result') {
      var solved = S.status === 'solved';
      body = '<div class="tm-panels"><div class="tm-graph ' + (solved ? 'ok' : 'bad') + '"><div class="tm-lbl">Outcome</div><div class="tm-big">' + (solved ? 'Solved' : 'Unsuccessful') + '</div></div>' +
        '<div class="tm-graph"><div class="tm-lbl">Guesses used</div><div class="tm-big">' + S.guesses.length + ' / ' + C.game.max + '</div></div>' +
        '<div class="tm-graph"><div class="tm-lbl">Time played</div><div class="tm-big">' + C.game.fmtTime(S.elapsed) + '</div></div></div>' +
        '<div class="tm-box"><div class="tm-lbl">Correct ' + (P.answers.length > 1 ? 'categories (any one counts)' : 'category') + '</div><div><b>' + P.answers.map(function (a) { return esc(C.game.categoryName(a)); }).join(', ') + '</b></div></div>' +
        (P.credibility.score ? '<div class="tm-box"><div class="tm-lbl">Credibility rating</div><div><b>' + P.credibility.score + ' / 5</b> <span class="tm-dots" aria-hidden="true">' + '●●●●●'.slice(0, P.credibility.score) + '<i>' + '●●●●●'.slice(0, 5 - P.credibility.score) + '</i></span></div></div>' : '') +
        crowd() +
        '<div class="tm-box"><div class="tm-lbl">Share your result (no spoilers)</div><pre class="tm-share">' + esc(C.game.shareText()) + '</pre>' +
        '<button type="button" class="xp-btn" data-act="copy">' + (copied ? 'Copied!' : 'Copy result') + '</button></div>';
    } else if (tabNow === 'explanation') {
      body = '<div class="tm-box"><div class="tm-lbl">' + P.answers.map(function (a) { return esc(C.game.categoryName(a)); }).join(' + ') + '</div><p>' + esc(P.explanation) + '</p></div>' +
        (P.credibility.why ? '<div class="tm-box"><div class="tm-lbl">Why the credibility rating is ' + (P.credibility.score || '?') + ' / 5</div><p>' + esc(P.credibility.why) + '</p></div>' : '');
    } else {
      var all = [P.source].concat(P.clues);
      body = '<div class="tm-box"><div class="tm-lbl">The article and its supporting links</div>' + all.map(function (u, i) {
        var seen = S.visited.indexOf(u.replace(/#.*$/, '')) !== -1;
        return '<div class="tm-src"><a href="#" data-src="' + i + '">' + esc(label(u)) + '</a> <span class="muted small">' + (i === 0 ? 'the article' : 'supporting link') + (seen ? ' · you opened this' : ' · not opened here') + '</span></div>';
      }).join('') + '</div>';
    }
    root.innerHTML = head + '<div class="tm-body">' + body + '</div>';
  }

  function build(body) {
    body.classList.add('tm'); root = body;
    body.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tab]'), c = e.target.closest('[data-act=copy]'), o = e.target.closest('[data-src]');
      if (t) { tabNow = t.getAttribute('data-tab'); render(); return; }
      if (o) { e.preventDefault(); C.browser.open([C.puzzle.source].concat(C.puzzle.clues)[+o.getAttribute('data-src')]); return; }
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
