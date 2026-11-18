/* Game state, persistence and rules. */
(function (C) {
  var cfg = C.config;
  var puzzle = C.puzzle;
  var KEY = 'credible:' + puzzle.id + ':' + puzzle.date;
  var blocked = false; // true while resetting so nothing re-saves

  function fresh() {
    return {
      v: 2, guesses: [], status: 'playing', elapsed: 0, selected: null, rating: 3, feedback: null,
      visited: [], sound: { muted: false, volume: 0.6 }, windows: {}, browser: null, welcomed: false, resultSeen: false
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var s = Object.assign(fresh(), JSON.parse(raw));
        // older saves stored a guess as just a category id
        s.guesses = (s.guesses || []).map(function (g) { return typeof g === 'string' ? { c: g, r: 0 } : g; });
        return s;
      }
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
    /* A question can have several correct categories; any of them is right. */
    isCorrect: function (id) { return puzzle.answers.indexOf(id) !== -1; },
    /* The credibility rating (1-5) is part of the answer when the question has one. */
    ratingRequired: function () { return puzzle.credibility.score > 0; },
    ratingOk: function (r) { return !game.ratingRequired() || Math.abs(r - puzzle.credibility.score) <= (cfg.ratingTolerance || 0); },
    isSolved: function (g) { return game.isCorrect(g.c) && game.ratingOk(g.r); },
    isOver: function () { return S.status !== 'playing'; },
    /* A category that was guessed and is wrong is ruled out. A right category with the wrong rating stays available. */
    ruledOut: function (id) { return S.guesses.some(function (g) { return g.c === id; }) && !game.isCorrect(id); },
    duplicate: function (id, r) { return S.guesses.some(function (g) { return g.c === id && g.r === r; }); },
    left: function () { return cfg.maxGuesses - S.guesses.length; },
    select: function (id) {
      if (game.isOver() || game.ruledOut(id)) return;
      S.selected = id; emit('select');
    },
    setRating: function (r) {
      r = Math.max(1, Math.min(5, Math.round(Number(r) || 3)));
      if (game.isOver() || r === S.rating) return;
      S.rating = r; emit('rating');
    },
    /* Submit a category and a credibility rating together. Investigation never calls this. Returns the feedback, or null if rejected. */
    submit: function (id, rating) {
      rating = game.ratingRequired() ? Math.max(1, Math.min(5, Math.round(Number(rating) || 0))) : 0;
      if (game.isOver() || !id || game.left() <= 0 || game.ruledOut(id) || game.duplicate(id, rating)) return null;
      if (game.ratingRequired() && !rating) return null;
      var cat = C.categories.filter(function (c) { return c.id === id; })[0];
      if (!cat) return null;
      var g = { c: id, r: rating };
      S.guesses.push(g);
      var catOk = game.isCorrect(id), rateOk = game.ratingOk(rating), correct = catOk && rateOk;
      if (correct) S.status = 'solved';
      else if (game.left() <= 0) S.status = 'failed';
      S.selected = null;
      var lines = [];
      if (correct) lines.push(game.ratingRequired() ? 'Correct! The category and the credibility rating both match.' : 'Correct. That category fits this article.');
      else {
        lines.push(catOk ? '✔ Category: that fits this article.' : '✖ Category: that doesn’t fit this article.');
        if (game.ratingRequired()) lines.push(rateOk ? '✔ Credibility rating: ' + rating + ' / 5 is right.' :
          '✖ Credibility rating: the real rating is ' + (rating < puzzle.credibility.score ? 'higher' : 'lower') + ' than ' + rating + '.');
      }
      S.feedback = { category: id, rating: rating, catOk: catOk, ratingOk: rateOk, correct: correct, lines: lines, text: lines.join(' '), left: game.left() };
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
      // green = category and rating right, yellow = category right only, red = category wrong
      var sq = S.guesses.map(function (g) { return game.isSolved(g) ? '\u{1F7E9}' : (game.isCorrect(g.c) ? '\u{1F7E8}' : '\u{1F7E5}'); });
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
