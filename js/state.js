/* Game state, persistence and rules. */
(function (C) {
  var cfg = C.config;
  var puzzle = C.puzzle;
  var KEY = 'credible:' + puzzle.id + ':' + puzzle.date;
  var blocked = false; // true while resetting so nothing re-saves

  function fresh() {
    return {
      v: 1, guesses: [], status: 'playing', elapsed: 0, selected: null, feedback: null,
      visited: [], sound: { muted: false, volume: 0.6 }, windows: {}, browser: null, welcomed: false, resultSeen: false
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(fresh(), JSON.parse(raw));
    } catch (e) { /* storage unavailable: play without persistence */ }
    return fresh();
  }

  var S = load();
  var listeners = [];

  function save() {
    if (blocked) return;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
  }

  function emit(what) {
    save();
    listeners.slice().forEach(function (fn) { fn(what || 'change'); });
  }

  var game = {
    puzzle: puzzle,
    max: cfg.maxGuesses,
    /* A question can have several correct categories; any of them solves it. */
    isCorrect: function (id) { return puzzle.answers.indexOf(id) !== -1; },
    isOver: function () { return S.status !== 'playing'; },
    guessed: function (id) { return S.guesses.indexOf(id) !== -1; },
    left: function () { return cfg.maxGuesses - S.guesses.length; },
    select: function (id) {
      if (game.isOver() || game.guessed(id)) return;
      S.selected = id; emit('select');
    },
    /* Submit a category. Investigation never calls this. Returns the result or null if rejected. */
    submit: function (id) {
      if (game.isOver() || !id || game.guessed(id) || game.left() <= 0) return null;
      var cat = C.categories.filter(function (c) { return c.id === id; })[0];
      if (!cat) return null;
      S.guesses.push(id);
      var correct = game.isCorrect(id);
      if (correct) S.status = 'solved';
      else if (game.left() <= 0) S.status = 'failed';
      S.selected = null;
      S.feedback = {
        category: id, correct: correct,
        text: correct ? 'Correct. That category fits this article.'
          : 'Not quite. That category doesn’t fit this article. Keep investigating its sources.',
        left: game.left()
      };
      emit(correct ? 'solved' : (S.status === 'failed' ? 'failed' : 'wrong'));
      return S.feedback;
    },
    markVisited: function (pageId) {
      pageId = String(pageId).replace(/#.*$/, '');
      if (S.visited.indexOf(pageId) === -1) { S.visited.push(pageId); save(); }
    },
    categoryName: function (id) {
      var c = C.categories.filter(function (x) { return x.id === id; })[0];
      return c ? c.name : id;
    },
    fmtTime: function (ms) {
      var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      return (h ? h + ':' + p(m) : m) + ':' + p(sec);
    },
    /* Spoiler-free: no category names, no explanation. */
    shareText: function () {
      var sq = S.guesses.map(function (g) { return game.isCorrect(g) ? '\u{1F7E9}' : '\u{1F7E5}'; });
      while (sq.length < cfg.maxGuesses) sq.push('⬜');
      var head = 'Credible ' + puzzle.date + ' · ' + (S.status === 'solved' ? 'Solved' : 'Not solved');
      return head + '\n' + sq.join('') + ' ' + S.guesses.length + '/' + cfg.maxGuesses + '\n⏱ ' + game.fmtTime(S.elapsed);
    },
    reset: function () {
      blocked = true;
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      location.reload();
    }
  };

  // Elapsed play time: counts only while the puzzle is unfinished and the tab is visible.
  var last = Date.now(), saveCounter = 0;
  setInterval(function () {
    var now = Date.now(), dt = now - last; last = now;
    if (S.status !== 'playing' || document.hidden) return;
    S.elapsed += Math.min(dt, 2000);
    if (++saveCounter % 5 === 0) save();
    listeners.slice().forEach(function (fn) { fn('tick'); });
  }, 1000);
  window.addEventListener('beforeunload', save);

  C.state = { get: function () { return S; }, save: save, emit: emit, on: function (fn) { listeners.push(fn); } };
  C.game = game;
})(window.Credible);
