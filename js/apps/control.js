/* Control Panel: pick a category and a credibility rating (together they are one answer), guesses left and feedback. */
(function (C) {
  var root;
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  function render() {
    var S = C.state.get(), over = C.game.isOver(), rated = C.game.ratingRequired();
    var pips = '';
    for (var i = 0; i < C.game.max; i++) {
      var g = S.guesses[i], cls = !g ? 'pip' : (C.game.isSolved(g) ? 'pip ok' : (C.game.isCorrect(g.c) ? 'pip part' : 'pip bad'));
      pips += '<span class="' + cls + '"></span>';
    }
    var tiles = C.categories.map(function (c) {
      var rejected = C.game.ruledOut(c.id), correct = S.status === 'solved' && C.game.isCorrect(c.id);
      var revealed = S.status === 'failed' && C.game.isCorrect(c.id);
      var cls = 'cp-tile' + (S.selected === c.id ? ' sel' : '') + (rejected ? ' rejected' : '') + (correct || revealed ? ' correct' : '');
      var off = over || rejected;
      return '<button type="button" class="' + cls + '" data-cat="' + c.id + '"' + (off ? ' disabled' : '') + ' aria-pressed="' + (S.selected === c.id) + '">' +
        '<span class="cp-ico">' + c.icon + '</span><span class="cp-txt"><b>' + esc(c.name) + '</b><span>' + esc(c.def) + '</span></span>' +
        (rejected ? '<span class="cp-mark">Ruled out</span>' : '') + (correct ? '<span class="cp-mark">Correct</span>' : '') + (revealed ? '<span class="cp-mark">Answer</span>' : '') + '</button>';
    }).join('');

    var fb = '';
    if (S.feedback) {
      fb = '<div class="cp-fb ' + (S.feedback.correct ? 'ok' : 'bad') + '" role="status">' +
        '<b>' + esc(C.game.categoryName(S.feedback.category)) + (rated ? ' · rated ' + S.feedback.rating + ' / 5' : '') + '</b><br>' +
        (S.feedback.lines || [S.feedback.text]).map(esc).join('<br>') + '</div>';
    }
    if (S.status === 'failed') fb += '<div class="cp-fb bad">Out of guesses. The answer is revealed in the results.</div>';

    var rate = '';
    if (rated) {
      rate = '<div class="cp-rate"><label for="cp-r"><b>Credibility rating</b> <span class="muted small">1 = not credible at all, 5 = very credible. It is part of your answer.</span></label>' +
        '<div class="cp-rr"><span>1</span><input id="cp-r" type="range" min="1" max="5" step="1" value="' + S.rating + '"' + (over ? ' disabled' : '') + ' aria-valuetext="' + S.rating + ' out of 5"><span>5</span>' +
        '<b class="cp-rv">' + S.rating + ' / 5</b></div></div>';
    }

    root.innerHTML =
      '<div class="cp-pane">' +
      '<div class="cp-box"><div class="cp-bh">Guesses remaining</div><div class="cp-bb"><div class="pips" aria-label="' + C.game.left() + ' of ' + C.game.max + ' guesses left">' + pips + '</div><div><b>' + C.game.left() + '</b> of ' + C.game.max + '</div></div></div>' +
      '<div class="cp-box"><div class="cp-bh">How it works</div><div class="cp-bb small"><div>Investigate in the browser for free. Only <b>Submit</b> uses a guess.' +
      (rated ? ' Each guess is a category <b>and</b> a rating; <span class="pip ok mini"></span> both right, <span class="pip part mini"></span> category only.' : '') + '</div></div></div>' +
      '<div class="cp-box"><div class="cp-bh">See also</div><div class="cp-bb"><a href="#" data-act="browser">Internet Browser</a>' +
      (over ? '<br><a href="#" data-act="results">Results (Task Manager)</a>' : '') + '</div></div></div>' +
      '<div class="cp-main"><div class="cp-scroll"><h2>Pick a category</h2><div class="cp-sub">Which best describes the article?</div>' +
      '<div class="cp-grid">' + tiles + '</div>' + fb + '</div>' + rate +
      '<div class="cp-foot"><span class="small cp-sel"></span>' +
      '<button type="button" class="xp-btn" data-act="submit">Submit answer</button></div></div>';
    updateFoot();
  }

  /* Cheap refresh for the footer, so dragging the slider does not rebuild (and drop) the slider itself. */
  function updateFoot() {
    var S = C.state.get(), over = C.game.isOver();
    var sel = S.selected ? C.game.categoryName(S.selected) : null;
    var can = !over && S.selected && !C.game.duplicate(S.selected, C.game.ratingRequired() ? S.rating : 0);
    var el = root.querySelector('.cp-sel'), btn = root.querySelector('[data-act=submit]'), rv = root.querySelector('.cp-rv');
    if (el) el.innerHTML = over ? 'Puzzle complete.' : (sel ? 'Selected: <b>' + esc(sel) + '</b>' + (C.game.ratingRequired() ? ' · rating <b>' + S.rating + '</b>' : '') : 'Select a category.') +
      (!over && S.selected && !can ? ' <span class="muted">(already guessed)</span>' : '');
    if (btn) btn.disabled = !can;
    if (rv) rv.textContent = S.rating + ' / 5';
  }

  function build(body) {
    body.classList.add('cp'); root = body;
    body.addEventListener('click', function (e) {
      var t = e.target.closest('[data-cat]'), a = e.target.closest('[data-act]');
      if (t && !t.disabled) { C.sound.play('click'); C.game.select(t.getAttribute('data-cat')); return; }
      if (!a) return;
      e.preventDefault();
      var k = a.getAttribute('data-act');
      if (k === 'submit') {
        var S = C.state.get(), res = C.game.submit(S.selected, S.rating);
        if (res) C.sound.play(res.correct ? 'right' : 'wrong');
      } else if (k === 'browser') C.wm.open('browser');
      else if (k === 'results') C.wm.open('taskmgr');
    });
    body.addEventListener('input', function (e) { if (e.target.id === 'cp-r') C.game.setRating(e.target.value); });
    C.state.on(function (what) {
      if (what === 'rating') updateFoot();
      else if (what !== 'tick' && what !== 'browse') render();
    });
    render();
  }
  C.controlPanel = { build: build };
})(window.Credible);
