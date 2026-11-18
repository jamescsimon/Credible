/* Control Panel: category definitions, selection, submission, guesses left and feedback. */
(function (C) {
  var root;
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  function render() {
    var S = C.state.get(), over = C.game.isOver();
    var pips = '';
    for (var i = 0; i < C.game.max; i++) {
      var g = S.guesses[i], cls = !g ? 'pip' : (C.game.isCorrect(g) ? 'pip ok' : 'pip bad');
      pips += '<span class="' + cls + '"></span>';
    }
    var tiles = C.categories.map(function (c) {
      var rejected = C.game.guessed(c.id) && !C.game.isCorrect(c.id), correct = S.status === 'solved' && C.game.isCorrect(c.id);
      var revealed = S.status === 'failed' && C.game.isCorrect(c.id);
      var cls = 'cp-tile' + (S.selected === c.id ? ' sel' : '') + (rejected ? ' rejected' : '') + (correct || revealed ? ' correct' : '');
      var off = over || rejected;
      return '<button type="button" class="' + cls + '" data-cat="' + c.id + '"' + (off ? ' disabled' : '') + ' aria-pressed="' + (S.selected === c.id) + '">' +
        '<span class="cp-ico">' + c.icon + '</span><span class="cp-txt"><b>' + esc(c.name) + '</b><span>' + esc(c.def) + '</span></span>' +
        (rejected ? '<span class="cp-mark">Ruled out</span>' : '') + (correct ? '<span class="cp-mark">Correct</span>' : '') + (revealed ? '<span class="cp-mark">Answer</span>' : '') + '</button>';
    }).join('');

    var fb = '';
    if (S.feedback) {
      fb = '<div class="cp-fb ' + (S.feedback.correct ? 'ok' : 'bad') + '" role="status"><b>' + (S.feedback.correct ? '✔ ' : '✖ ') +
        esc(C.game.categoryName(S.feedback.category)) + '</b><br>' + esc(S.feedback.text) + '</div>';
    }
    if (S.status === 'failed') fb += '<div class="cp-fb bad">Out of guesses. The answer is revealed in the results.</div>';

    var sel = S.selected ? C.game.categoryName(S.selected) : null;
    var canSubmit = !over && S.selected && !C.game.guessed(S.selected);
    root.innerHTML =
      '<div class="cp-pane">' +
      '<div class="cp-box"><div class="cp-bh">Guesses remaining</div><div class="cp-bb"><div class="pips" aria-label="' + C.game.left() + ' of ' + C.game.max + ' guesses left">' + pips + '</div><div><b>' + C.game.left() + '</b> of ' + C.game.max + '</div></div></div>' +
      '<div class="cp-box"><div class="cp-bh">How it works</div><div class="cp-bb small"><div>Investigate in the browser for free. Only <b>Submit</b> uses a guess.</div></div></div>' +
      '<div class="cp-box"><div class="cp-bh">See also</div><div class="cp-bb"><a href="#" data-act="browser">Internet Browser</a>' +
      (over ? '<br><a href="#" data-act="results">Results (Task Manager)</a>' : '') + '</div></div></div>' +
      '<div class="cp-main"><div class="cp-scroll"><h2>Pick a category</h2><div class="cp-sub">Which best describes the article?</div>' +
      '<div class="cp-grid">' + tiles + '</div>' + fb + '</div>' +
      '<div class="cp-foot"><span class="small">' + (over ? 'Puzzle complete.' : (sel ? 'Selected: <b>' + esc(sel) + '</b>' : 'Select a category.')) + '</span>' +
      '<button type="button" class="xp-btn" data-act="submit"' + (canSubmit ? '' : ' disabled') + '>Submit answer</button></div></div>';
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
        var S = C.state.get(), res = C.game.submit(S.selected);
        if (res) C.sound.play(res.correct ? 'right' : 'wrong');
      } else if (k === 'browser') C.wm.open('browser');
      else if (k === 'results') C.wm.open('taskmgr');
    });
    C.state.on(function (what) { if (what !== 'tick' && what !== 'browse') render(); });
    render();
  }
  C.controlPanel = { build: build };
})(window.Credible);
