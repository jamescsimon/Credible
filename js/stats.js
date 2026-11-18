/* Reports one finished game to the Google Sheet (Apps Script web app) so it can update the running averages.
   Sent at most once per puzzle per browser, even across demo resets. Silent no-op when config.sheetUrl is empty. */
(function (C) {
  var cfg = C.config, P = C.puzzle;
  var KEY = 'credible:reported:' + P.id + ':' + P.date;
  function reported() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
  function mark() { try { localStorage.setItem(KEY, '1'); } catch (e) { /* ignore */ } }

  function report() {
    var S = C.state.get();
    if (!cfg.sheetUrl || reported() || !C.game.isOver()) return;
    mark();
    var body = JSON.stringify({ date: P.date, guesses: S.guesses.length, seconds: Math.round(S.elapsed / 1000), solved: S.status === 'solved' });
    try {
      // text/plain + no-cors avoids a CORS preflight, which Apps Script web apps do not answer.
      fetch(cfg.sheetUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body, keepalive: true })
        .catch(function () { try { localStorage.removeItem(KEY); } catch (e) { /* retry next time */ } });
    } catch (e) { try { localStorage.removeItem(KEY); } catch (e2) { /* ignore */ } }
  }

  C.state.on(function (what) { if (what === 'solved' || what === 'failed') report(); });
  report(); // finished earlier but never reported (e.g. offline at the time)
  C.stats = { report: report, aggregate: P.stats };
})(window.Credible);
