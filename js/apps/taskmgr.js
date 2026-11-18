/* Task Manager: the finished puzzle's result, explanation, sources, how you compare with everyone else, and share text. */
(function (C) {
  var root, tabNow = 'result', copied = false;
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------- estimated bell curve ----------
     Only averages are stored (no individual scores), so the spread is assumed: a normal (Gaussian) distribution centred on the
     average, with a made-up standard deviation. The curve and the "better than N%" figure are estimates, not measurements. */
  function erf(x) { // Abramowitz & Stegun 7.1.26
    var s = x < 0 ? -1 : 1; x = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * x);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  var cdf = function (z) { return 0.5 * (1 + erf(z / Math.SQRT2)); };
  var pdf = function (x, mu, sd) { var z = (x - mu) / sd; return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI)); };

  /* Share of players you beat, where lower is better (fewer tries, less time). */
  function beat(value, mu, sd) { return Math.max(1, Math.min(99, Math.round(100 * (1 - cdf((value - mu) / sd))))); }

  function chart(o) { // o: {mu, sd, value, title, valueLabel, avgLabel, better}
    var W = 320, H = 118, L = 8, R = 8, T = 14, Bt = 24;
    var lo = Math.max(0, o.mu - 3 * o.sd), hi = o.mu + 3 * o.sd;
    lo = Math.max(0, Math.min(lo, o.value - 0.4 * o.sd)); hi = Math.max(hi, o.value + 0.4 * o.sd);
    var X = function (v) { return L + (v - lo) / (hi - lo) * (W - L - R); };
    var peak = pdf(o.mu, o.mu, o.sd), Y = function (v) { return H - Bt - pdf(v, o.mu, o.sd) / peak * (H - Bt - T); };
    var pts = [], i;
    for (i = 0; i <= 60; i++) { var v = lo + (hi - lo) * i / 60; pts.push(X(v).toFixed(1) + ',' + Y(v).toFixed(1)); }
    var area = 'M' + X(lo).toFixed(1) + ',' + (H - Bt) + ' L' + pts.join(' L') + ' L' + X(hi).toFixed(1) + ',' + (H - Bt) + ' Z';
    var xv = X(o.value), xm = X(o.mu);
    return '<div class="tm-chart"><div class="tm-lbl">' + esc(o.title) + '</div>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.title + ': ' + o.better) + '">' +
      '<path d="' + area + '" fill="#cfe0ff" stroke="#2a62d6" stroke-width="1.5"/>' +
      '<line x1="' + xm.toFixed(1) + '" y1="' + T + '" x2="' + xm.toFixed(1) + '" y2="' + (H - Bt) + '" stroke="#555" stroke-dasharray="3 3"/>' +
      '<text x="' + xm.toFixed(1) + '" y="' + (T - 3) + '" font-size="9" text-anchor="middle" fill="#444">avg ' + esc(o.avgLabel) + '</text>' +
      '<line x1="' + xv.toFixed(1) + '" y1="' + (T + 6) + '" x2="' + xv.toFixed(1) + '" y2="' + (H - Bt) + '" stroke="#d8433a" stroke-width="2"/>' +
      '<polygon points="' + (xv - 5).toFixed(1) + ',' + (T + 1) + ' ' + (xv + 5).toFixed(1) + ',' + (T + 1) + ' ' + xv.toFixed(1) + ',' + (T + 9) + '" fill="#d8433a"/>' +
      '<text x="' + Math.min(W - 24, Math.max(24, xv)).toFixed(1) + '" y="' + (H - 11) + '" font-size="10" font-weight="bold" text-anchor="middle" fill="#d8433a">you: ' + esc(o.valueLabel) + '</text>' +
      '<line x1="' + L + '" y1="' + (H - Bt) + '" x2="' + (W - R) + '" y2="' + (H - Bt) + '" stroke="#888"/></svg>' +
      '<div class="small">' + esc(o.better) + '</div></div>';
  }

  function everyone() {
    var S = C.state.get(), a = C.puzzle.stats;
    if (!a || !a.completed) return '<div class="tm-box"><div class="tm-lbl">Everyone else</div><p>Nobody has finished this question yet, so there is nothing to compare with. You would be the first.</p></div>';
    var tries = S.guesses.length, secs = S.elapsed / 1000;
    var sdT = Math.max(0.5, 0.35 * a.avgGuesses), sdS = Math.max(10, 0.45 * a.avgTimeSec);
    var pT = beat(tries, a.avgGuesses, sdT), pS = beat(secs, a.avgTimeSec, sdS);
    var phrase = function (p, good, bad) { return p >= 50 ? good + ' about ' + p + '% of players' : bad + ' about ' + (100 - p) + '% of players'; };
    return '<div class="tm-box"><div class="tm-lbl">Everyone else so far</div><div class="small">' + a.completed + ' player' + (a.completed === 1 ? '' : 's') + ' finished · ' +
      Math.round(100 * a.solved / a.completed) + '% solved<br>Average tries: <b>' + a.avgGuesses.toFixed(1) + '</b> · Average time: <b>' + C.game.fmtTime(a.avgTimeSec * 1000) + '</b></div></div>' +
      chart({ title: 'Time', mu: a.avgTimeSec, sd: sdS, value: secs, valueLabel: C.game.fmtTime(S.elapsed), avgLabel: C.game.fmtTime(a.avgTimeSec * 1000),
        better: 'You were ' + phrase(pS, 'faster than', 'slower than') + '.' }) +
      chart({ title: 'Tries', mu: a.avgGuesses, sd: sdT, value: tries, valueLabel: String(tries), avgLabel: a.avgGuesses.toFixed(1),
        better: 'You used ' + (pT >= 50 ? 'fewer tries than about ' + pT : 'more tries than about ' + (100 - pT)) + '% of players.' }) +
      '<div class="small muted">Estimated bell curves built from the averages only (a normal distribution with an assumed spread), since individual scores aren’t stored. Treat the percentages as a rough guide.' +
      (C.timeTravel ? ' Games played while time-travelling are not added to these numbers.' : '') + '</div>';
  }

  function label(u) {
    try { var x = new URL(u), p = x.pathname === '/' ? '' : x.pathname.replace(/\/$/, ''), t = x.hostname.replace(/^www\./, '') + p; return t.length > 52 ? t.slice(0, 49) + '…' : t; } catch (e) { return u; }
  }

  function render() {
    var S = C.state.get(), P = C.game.puzzle, over = C.game.isOver();
    var tabs = ['result', 'everyone', 'explanation', 'sources'], names = { result: 'Result', everyone: 'Everyone', explanation: 'Explanation', sources: 'Sources' };
    var head = '<div class="tm-tabs" role="tablist">' + tabs.map(function (t) {
      return '<button type="button" role="tab" class="tm-tab' + (t === tabNow ? ' on' : '') + '" data-tab="' + t + '" aria-selected="' + (t === tabNow) + '">' + names[t] + '</button>';
    }).join('') + '</div>';
    var cats = P.answers.map(function (a) { return esc(C.game.categoryName(a)); });
    var body;
    if (!over) {
      body = '<div class="tm-lock"><div class="tm-big">Puzzle in progress</div><p>Results, the explanation and the sources unlock when you solve the puzzle or use all ' + C.game.max + ' guesses.</p>' +
        '<p class="small">Guesses used: ' + S.guesses.length + ' of ' + C.game.max + '<br>Time played: ' + C.game.fmtTime(S.elapsed) + '</p></div>';
    } else if (tabNow === 'result') {
      var solved = S.status === 'solved', last = S.guesses[S.guesses.length - 1], score = P.credibility.score;
      body = '<div class="tm-panels"><div class="tm-graph ' + (solved ? 'ok' : 'bad') + '"><div class="tm-lbl">Outcome</div><div class="tm-big">' + (solved ? 'Solved' : 'Unsuccessful') + '</div></div>' +
        '<div class="tm-graph"><div class="tm-lbl">Guesses used</div><div class="tm-big">' + S.guesses.length + ' / ' + C.game.max + '</div></div>' +
        '<div class="tm-graph"><div class="tm-lbl">Time played</div><div class="tm-big">' + C.game.fmtTime(S.elapsed) + '</div></div></div>' +
        '<div class="tm-box"><div class="tm-lbl">Correct ' + (P.answers.length > 1 ? 'categories (any one counts)' : 'category') + '</div><div><b>' + cats.join(', ') + '</b></div></div>' +
        (score ? '<div class="tm-box"><div class="tm-lbl">Credibility rating</div><div><b>' + score + ' / 5</b> <span class="tm-dots" aria-hidden="true">' + '●●●●●'.slice(0, score) + '<i>' + '●●●●●'.slice(0, 5 - score) + '</i></span>' +
          (last && last.r ? ' <span class="muted small">· your last guess: ' + last.r + ' / 5</span>' : '') + '</div></div>' : '') +
        '<div class="tm-box"><div class="tm-lbl">Share your result (no spoilers)</div><pre class="tm-share">' + esc(C.game.shareText()) + '</pre>' +
        '<button type="button" class="xp-btn" data-act="copy">' + (copied ? 'Copied!' : 'Copy result') + '</button></div>';
    } else if (tabNow === 'everyone') {
      body = everyone();
    } else if (tabNow === 'explanation') {
      body = '<div class="tm-box"><div class="tm-lbl">' + cats.join(' + ') + '</div><p>' + esc(P.explanation) + '</p></div>' +
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
    C.state.on(function (what) { if (what !== 'browse' && what !== 'rating') render(); });
    render();
  }
  C.taskManager = { build: build, _math: { cdf: cdf, beat: beat } };
})(window.Credible);
