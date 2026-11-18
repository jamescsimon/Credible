/* Internet Browser: shows the real article (and any page the player opens) in an embedded frame, and keeps a history.
   Limits of embedding: a page inside a frame from another site cannot be read or observed, so only pages opened from the
   address bar, the Links list or the Results window are recorded. Some sites refuse to be framed; "Open in new tab" covers that. */
(function (C) {
  var P = C.puzzle;
  var SEARCH = 'https://duckduckgo.com/?q=';
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  function safe(u) {
    try { var x = new URL(String(u).trim()); return (x.protocol === 'http:' || x.protocol === 'https:') ? x.href : null; } catch (e) { return null; }
  }
  /* Same page regardless of #fragment. */
  var same = function (u) { return String(u).replace(/#.*$/, ''); };
  function label(u) {
    try {
      var x = new URL(u), p = x.pathname === '/' ? '' : x.pathname.replace(/\/$/, '');
      var s = x.hostname.replace(/^www\./, '') + p;
      return s.length > 46 ? s.slice(0, 43) + '…' : s;
    } catch (e) { return u; }
  }

  // On localhost use the local proxy (node proxy/server.js). Anywhere else use the hosted one (proxy/worker.js). Never probe
  // localhost from a public page: the visitor has no such proxy and Chrome would ask them for local-network permission.
  var onLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var PROXY = ((onLocal ? (C.config.localProxyUrl || C.config.proxyUrl) : C.config.proxyUrl) || '').replace(/\/+$/, '');
  var proxyOn = false, ready = !PROXY, expect = null, prevReal = null;
  var els = {}, loaded = null;
  var srcFor = function (u) { return proxyOn ? PROXY + '/?url=' + encodeURIComponent(u) : u; };
  /* A proxy on the app's own origin would let framed pages touch the app, so then the frame gets no same-origin right. */
  function applySandbox() {
    var sameOrigin = proxyOn && new URL(PROXY, location.href).origin === location.origin;
    els.frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms' + (sameOrigin ? '' : ' allow-same-origin'));
  }
  function B() {
    var S = C.state.get(), b = S.browser;
    if (!b || !Array.isArray(b.stack) || !Array.isArray(b.log)) {
      b = S.browser = { stack: [P.source], i: 0, log: [{ k: 'visit', v: P.source }], side: true };
      C.game.markVisited(P.source);
    }
    return b;
  }
  var cur = function (b) { return b.stack[b.i]; };

  function render() {
    var b = B(), u = cur(b);
    els.back.disabled = b.i <= 0; els.fwd.disabled = b.i >= b.stack.length - 1;
    els.addr.value = u;
    var s = srcFor(u);
    if (ready && loaded !== s) { prevReal = loaded === null ? null : expectedFrom(loaded); loaded = s; expect = u; applySandbox(); els.frame.src = s; }
    els.status.textContent = proxyOn
      ? 'Pages load through the Credible proxy, and links you click inside them are recorded in History. If one still looks wrong, use ↗ to open it in a new tab.'
      : 'Pages load straight from the web. Some sites refuse to be embedded and stay blank: use ↗ to open them in a new tab. Links clicked inside a page are not recorded in History.';
    els.body.classList.toggle('noside', !b.side);
    els.panel.setAttribute('aria-pressed', String(!!b.side));

    var S = C.state.get();
    var links = P.clues.length ? P.clues.map(function (c, i) {
      var seen = S.visited.indexOf(same(c)) !== -1;
      return '<li><button type="button" class="br-link" data-url="' + i + '" title="' + esc(c) + '">' + (seen ? '✓ ' : '') + esc(label(c)) + '</button></li>';
    }).join('') : '<li class="muted small">No links were collected for this article.</li>';
    var hist = b.log.slice().reverse().map(function (h) {
      return h.k === 'search' ? '<li class="br-h"><span class="br-hi">🔍</span> ' + esc(h.v) + '</li>'
        : '<li class="br-h"><button type="button" class="br-link" data-hist="' + esc(h.v) + '" title="' + esc(h.v) + '"><span class="br-hi">🌐</span> ' + esc(h.t ? h.t.slice(0, 60) : label(h.v)) + '</button></li>';
    }).join('');
    els.side.innerHTML = '<h4>Links from the article</h4><ul>' + links + '</ul><h4>History <span class="muted small">(' + b.log.length + ')</span></h4><ul>' + hist + '</ul>';
    C.wm.setTitle('browser', label(u) + ' - Internet Browser');
  }

  function go(u) {
    u = safe(u); if (!u) return false;
    var b = B();
    if (same(cur(b)) !== same(u)) {
      b.stack = b.stack.slice(0, b.i + 1); b.stack.push(u); b.i = b.stack.length - 1;
    }
    b.log.push({ k: 'visit', v: u });
    if (b.log.length > 200) b.log.shift();
    C.game.markVisited(u);
    C.sound.play('click');
    C.state.emit('browse');
    return true;
  }

  function submitAddr() {
    var v = els.addr.value.trim();
    if (!v) return;
    if (/^\S+\.\S+$/.test(v)) { if (go(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : 'https://' + v)) return; }
    // Anything else is a web search. Results open in a real tab (they cannot be shown inside the frame) and the query is logged.
    var b = B();
    b.log.push({ k: 'search', v: v });
    C.state.emit('browse');
    window.open(SEARCH + encodeURIComponent(v), '_blank', 'noopener,noreferrer');
  }

  function build(body) {
    body.classList.add('br');
    body.innerHTML =
      '<div class="br-bar"><button type="button" class="br-b" data-act="back" title="Back">◀ Back</button><button type="button" class="br-b" data-act="fwd" title="Forward" aria-label="Forward">▶</button>' +
      '<button type="button" class="br-b" data-act="home" title="Back to the article">⌂ Home</button>' +
      '<input class="br-addr" type="text" spellcheck="false" aria-label="Address bar or search" placeholder="Type a web address, or search the web">' +
      '<button type="button" class="br-b" data-act="go">Go</button>' +
      '<button type="button" class="br-b" data-act="ext" title="Open this page in a new browser tab">↗</button>' +
      '<button type="button" class="br-b" data-act="panel" title="Links and history" aria-pressed="true">☰</button></div>' +
      '<div class="br-main"><div class="br-frame"><iframe title="Embedded content" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen ' +
      'referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"></iframe></div>' +
      '<aside class="br-side" aria-label="Links and history"></aside></div>' +
      '<div class="br-status"></div>';
    els = { body: body, frame: body.querySelector('iframe'), addr: body.querySelector('.br-addr'), side: body.querySelector('.br-side'),
      status: body.querySelector('.br-status'), back: body.querySelector('[data-act=back]'), fwd: body.querySelector('[data-act=fwd]'), panel: body.querySelector('[data-act=panel]') };

    body.addEventListener('click', function (e) {
      var act = e.target.closest('[data-act]'), cl = e.target.closest('[data-url]'), hi = e.target.closest('[data-hist]'), b = B();
      if (cl) { go(P.clues[+cl.getAttribute('data-url')]); return; }
      if (hi) { go(hi.getAttribute('data-hist')); return; }
      if (!act) return;
      var k = act.getAttribute('data-act');
      if (k === 'back' && b.i > 0) { b.i--; C.state.emit('browse'); }
      else if (k === 'fwd' && b.i < b.stack.length - 1) { b.i++; C.state.emit('browse'); }
      else if (k === 'home') go(P.source);
      else if (k === 'go') submitAddr();
      else if (k === 'ext') window.open(cur(b), '_blank', 'noopener,noreferrer');
      else if (k === 'panel') { b.side = !b.side; C.state.emit('browse'); }
    });
    els.addr.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitAddr(); });
    C.state.on(function (what) { if (what === 'browse') render(); });
    window.addEventListener('message', onFrameMessage);
    render();
    if (PROXY) {
      // Use the proxy only if it is reachable; otherwise fall back to loading pages directly.
      var settle = function (on) { if (ready) return; proxyOn = on; ready = true; render(); };
      fetch(PROXY + '/?ping', { mode: 'no-cors', signal: AbortSignal.timeout ? AbortSignal.timeout(2500) : undefined }).then(function () { settle(true); }, function () { settle(false); });
    }
  }

  /* The proxied page tells us which address it really is (after redirects and in-page link clicks). */
  function expectedFrom(src) {
    try { var q = new URL(src); return q.searchParams.get('url') || src; } catch (e) { return src; }
  }
  function onFrameMessage(e) {
    var d = e.data;
    if (!d || d.credible !== 'loaded' || !els.frame || e.source !== els.frame.contentWindow || !proxyOn) return;
    var u = safe(d.url); if (!u) return;
    var b = B(), now = cur(b), title = String(d.title || '').trim();
    if (expect) {
      if (same(u) === same(prevReal || '') && same(prevReal || '') !== same(expect)) return;     // late message from the previous page
      expect = null;
      if (same(u) !== same(now)) {                       // the address we asked for redirected: keep one history entry
        b.stack[b.i] = u; loaded = srcFor(u);
        var last = b.log[b.log.length - 1]; if (last && last.k === 'visit') last.v = u;
        C.game.markVisited(same(u));
      }
    } else if (same(u) !== same(now)) {                   // the player clicked a link inside the page
      b.stack = b.stack.slice(0, b.i + 1); b.stack.push(u); b.i = b.stack.length - 1; loaded = srcFor(u);
      b.log.push({ k: 'visit', v: u }); if (b.log.length > 200) b.log.shift();
      C.game.markVisited(same(u));
      C.sound.play('click');
    }
    for (var i = b.log.length - 1; i >= 0; i--) { if (b.log[i].k === 'visit' && same(b.log[i].v) === same(u)) { if (title) b.log[i].t = title; break; } }
    C.state.emit('browse');
  }

  C.browser = {
    build: build,
    /* Open any web address in the browser window, e.g. a source from the results screen. */
    open: function (url) { C.wm.open('browser'); go(url); }
  };
})(window.Credible);
