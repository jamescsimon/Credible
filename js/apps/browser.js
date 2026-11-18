/* Simulated browser: tabs, history, address bar, curated pages, keyword search. All content is local. */
(function (C) {
  var P = C.puzzle;
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var SEARCH_PREFIX = 'findit.example/search?q=';

  // ---------- URL <-> route ----------
  function norm(u) {
    return String(u).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/#.*$/, '').replace(/\/+$/, '');
  }
  var urlMap = {};
  urlMap[norm(P.post.url)] = 'post';
  urlMap[norm(P.post.url + '/photo/1')] = 'media:' + P.post.image;
  Object.keys(P.profiles).forEach(function (h) { urlMap[norm(P.profiles[h].url)] = 'profile:' + h; });
  Object.keys(P.pages).forEach(function (id) { urlMap[norm(P.pages[id].url)] = 'page:' + id; });

  function parseHref(href) {
    var n = norm(href);
    if (n.indexOf(SEARCH_PREFIX) === 0) {
      var q = n.slice(SEARCH_PREFIX.length);
      try { q = decodeURIComponent(q.replace(/\+/g, ' ')); } catch (e) { /* keep raw */ }
      return 'search:' + q;
    }
    if (n === 'findit.example') return 'search:';
    return urlMap[n] || ('notfound:' + href);
  }
  function routeUrl(r) {
    var k = r.split(':')[0], v = r.slice(k.length + 1);
    if (r === 'post') return P.post.url;
    if (k === 'media') return P.post.url + '/photo/1';
    if (k === 'profile' && P.profiles[v]) return P.profiles[v].url;
    if (k === 'page' && P.pages[v]) return P.pages[v].url;
    if (k === 'search') return SEARCH_PREFIX + encodeURIComponent(v);
    if (k === 'notfound') return v;
    return '';
  }

  // ---------- Search ----------
  var STOP = ['the', 'a', 'an', 'of', 'in', 'on', 'and', 'is', 'are', 'was', 'did', 'for', 'to', 'at', 'this', 'that', 'from', 'with', 'how', 'what', 'where', 'when', 'who', 'it', 'its', 'by', 'about'];
  function tokens(q) {
    return q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function (t) { return t && STOP.indexOf(t) === -1; });
  }
  function runSearch(q) {
    var toks = tokens(q);
    if (!toks.length) return [];
    var out = [];
    P.search.entries.forEach(function (e, idx) {
      var title = e.page ? P.pages[e.page].title : e.title;
      var hay = e.keywords.concat(tokens(title));
      var score = 0;
      toks.forEach(function (t) {
        if (t.length < 3 && !/^\d+$/.test(t)) return;
        var hit = hay.some(function (k) { return k === t || (t.length >= 4 && (k.indexOf(t) !== -1 || (k.length >= 4 && t.indexOf(k) !== -1))); });
        if (hit) score++;
      });
      if (score > 0) out.push({ e: e, score: score, idx: idx });
    });
    out.sort(function (a, b) { return b.score - a.score || a.idx - b.idx; });
    return out.map(function (o) { return o.e; });
  }

  // ---------- Page renderers ----------
  function avatar(p, size) {
    return '<span class="ch-av" style="background:' + p.color + ';width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.45) + 'px">' + esc(p.name.charAt(0)) + '</span>';
  }
  function img(key) { return '<div class="img-box">' + P.images[key] + '</div>'; }
  function fill(html) {
    return html.replace(/\{\{image:(\w+)(?:\|([^}]*))?\}\}/g, function (_, k, cap) {
      return '<figure class="pg-fig">' + img(k) + (cap ? '<figcaption>' + esc(cap) + '</figcaption>' : '') + '</figure>';
    });
  }

  function renderPost() {
    var p = P.post, a = P.profiles[p.author];
    var cm = P.comments.map(function (c) {
      var pr = P.profiles[c.handle] || { name: c.name, color: '#888' };
      return '<div class="ch-comment">' + avatar(pr, 36) + '<div class="ch-cbody"><div class="ch-who"><a href="' + esc(pr.url || '') + '"><b>' + esc(c.name) + '</b></a> <span class="muted">@' + esc(c.handle) + ' · ' + esc(c.time) + '</span></div><div>' + c.html + '</div></div></div>';
    }).join('');
    return '<div class="ch"><div class="ch-head"><span class="ch-logo">Chirper</span><span class="muted small">' + esc(P.platform.tagline) + '</span></div>' +
      '<article class="ch-post"><div class="ch-who">' + avatar(a, 46) + '<div><a href="' + esc(a.url) + '"><b>' + esc(a.name) + '</b></a><div class="muted">@' + esc(a.handle) + '</div></div><button class="ch-follow" type="button" tabindex="-1">Follow</button></div>' +
      '<p class="ch-text">' + esc(p.text) + '</p>' +
      '<a class="ch-media" data-go="media:' + p.image + '" href="#" title="Open image">' + img(p.image) + '<span class="ch-alt">ALT</span></a>' +
      '<div class="muted small ch-time">' + esc(p.time) + '</div>' +
      '</article>' +
      '<section class="ch-comments"><h4>Replies (' + P.comments.length + ')</h4>' + cm + '</section></div>';
  }

  function renderProfile(h) {
    var p = P.profiles[h];
    if (!p) return renderNotFound(h);
    var posts = p.posts.map(function (x) { return '<div class="ch-comment">' + avatar(p, 34) + '<div class="ch-cbody"><div class="muted small">' + esc(x.time) + '</div><div>' + esc(x.text) + '</div></div></div>'; }).join('');
    return '<div class="ch"><div class="ch-head"><span class="ch-logo">Chirper</span></div>' +
      '<div class="pf-banner" style="background:linear-gradient(135deg,' + p.color + ',#2b3a55)"></div>' +
      '<div class="pf-main">' + avatar(p, 72) + '<h2>' + esc(p.name) + '</h2><div class="muted">@' + esc(p.handle) + '</div>' +
      '<p>' + esc(p.bio) + '</p><div class="muted small">📍 ' + esc(p.location) + ' · Joined ' + esc(p.joined) + '</div>' +
      '<div class="small"><b>' + esc(p.following) + '</b> Following · <b>' + esc(p.followers) + '</b> Followers</div></div>' +
      '<section class="ch-comments"><h4>Recent posts</h4>' + posts + '</section></div>';
  }

  function renderMedia(key) {
    var p = P.post;
    return '<div class="ch"><div class="ch-head"><span class="ch-logo">Chirper</span><span class="muted small">Image viewer</span></div>' +
      '<div class="md-view">' + img(key) + '</div>' +
      '<div class="md-info"><h4>Image details</h4><table class="kv"><tr><th>Description (alt text)</th><td>' + esc(p.imageAlt) + '</td></tr>' +
      '<tr><th>Posted by</th><td>@' + esc(p.author) + '</td></tr><tr><th>Uploaded</th><td>' + esc(p.time) + '</td></tr>' +
      '<tr><th>File</th><td>IMG_4471.jpg · 1600 × 1067</td></tr>' +
      '<tr><th>Camera data</th><td>Removed by Chirper on upload</td></tr></table>' +
      '<p><a href="#" data-go="search:flood photo" class="btn-link">🔍 Search the web for this image</a> &nbsp; <a href="#" data-go="post">← Back to post</a></p></div></div>';
  }

  function renderPage(id) {
    var pg = P.pages[id];
    if (!pg) return renderNotFound(id);
    return '<div class="pg pg-' + pg.theme + '"><div class="pg-mast"><span class="pg-site">' + esc(pg.site) + '</span></div>' +
      '<div class="pg-wrap"><h1>' + esc(pg.title) + '</h1><div class="pg-meta">' + esc(pg.meta || '') + '</div>' + fill(pg.body) + '</div></div>';
  }

  function searchBox(q) {
    return '<form class="fi-form" data-search><input name="q" type="text" value="' + esc(q) + '" placeholder="Search the web" autocomplete="off" aria-label="Search query"><button type="submit">Search</button></form>';
  }
  function renderSearch(q) {
    var head = '<div class="fi"><div class="fi-head"><span class="fi-logo">' + esc(P.search.siteName) + '</span>' + searchBox(q) + '</div>';
    if (!q.trim()) {
      return head + '<div class="fi-body fi-home"><p>Search the curated web for this demo.</p><p class="muted small">' + esc(P.search.tips) + '</p></div></div>';
    }
    var res = runSearch(q);
    if (!res.length) {
      return head + '<div class="fi-body"><h3>No results for “' + esc(q) + '”</h3><ul class="small"><li>Check your spelling or try fewer words.</li><li>' + esc(P.search.tips) + '</li></ul></div></div>';
    }
    var items = res.map(function (e) {
      var route = e.page ? 'page:' + e.page : e.route;
      var title = e.page ? P.pages[e.page].title : e.title;
      var url = e.page ? P.pages[e.page].url : e.url;
      return '<div class="fi-res"><div class="fi-url">' + esc(url) + '</div><a href="#" data-go="' + esc(route) + '">' + esc(title) + '</a><div class="fi-snip">' + esc(e.snippet) + '</div></div>';
    }).join('');
    return head + '<div class="fi-body"><div class="muted small">' + res.length + ' result' + (res.length === 1 ? '' : 's') + '</div>' + items + '</div></div>';
  }

  function renderNotFound(u) {
    return '<div class="nf"><h2>This page can’t be displayed</h2><p>The address <b>' + esc(u) + '</b> isn’t part of this simulation. Only curated pages are available, and nothing leaves this demo.</p>' +
      '<p><a href="#" data-go="search:">Open the search page</a> · <a href="#" data-go="post">Return to the post</a></p></div>';
  }

  function info(r) {
    var k = r.split(':')[0], v = r.slice(k.length + 1);
    if (r === 'post') return { title: 'Post by @' + P.post.author, html: renderPost() };
    if (k === 'profile') return { title: P.profiles[v] ? P.profiles[v].name + ' (@' + v + ')' : 'Profile unavailable', html: renderProfile(v) };
    if (k === 'media') return { title: 'Image — Chirper', html: renderMedia(v) };
    if (k === 'page') return { title: P.pages[v] ? P.pages[v].title : 'Not found', html: renderPage(v) };
    if (k === 'search') return { title: v ? 'Search: ' + v : 'FindIt', html: renderSearch(v) };
    return { title: 'Page can’t be displayed', html: renderNotFound(v) };
  }

  // ---------- Browser window ----------
  var els = {};
  function B() {
    var S = C.state.get();
    if (!S.browser || !S.browser.tabs || !S.browser.tabs.length) S.browser = { tabs: [{ h: ['post'], i: 0 }], active: 0 };
    return S.browser;
  }
  function tab() { var b = B(); return b.tabs[Math.min(b.active, b.tabs.length - 1)]; }
  function cur(t) { return t.h[t.i]; }

  function render() {
    var b = B(), t = tab(), r = cur(t), pg = info(r);
    if (r.indexOf('page:') === 0) C.game.markVisited(r.slice(5));
    els.tabs.innerHTML = b.tabs.map(function (tb, i) {
      var title = info(cur(tb)).title;
      return '<div class="br-tab' + (i === b.active ? ' on' : '') + '" data-tab="' + i + '"><span class="br-ttl">' + esc(title) + '</span>' +
        (b.tabs.length > 1 ? '<button type="button" class="br-x" data-close="' + i + '" aria-label="Close tab">×</button>' : '') + '</div>';
    }).join('') + '<button type="button" class="br-new" title="New tab (search)" aria-label="New tab">+</button>';
    els.back.disabled = t.i <= 0; els.fwd.disabled = t.i >= t.h.length - 1;
    els.addr.value = routeUrl(r);
    els.view.innerHTML = pg.html;
    els.view.scrollTop = 0;
    els.status.textContent = 'Done';
    var q = els.view.querySelector('.fi-form input');
    if (q && !q.value) q.focus();
    C.wm.setTitle('browser', pg.title + ' - Internet Browser');
  }

  function go(r) {
    var t = tab();
    if (cur(t) === r) return;
    t.h = t.h.slice(0, t.i + 1); t.h.push(r); t.i = t.h.length - 1;
    C.sound.play('click');
    C.state.emit('browse');
  }

  function build(body) {
    body.classList.add('br');
    body.innerHTML = '<div class="br-tabs"></div>' +
      '<div class="br-bar"><button type="button" class="br-b" data-act="back" title="Back">◀ Back</button><button type="button" class="br-b" data-act="fwd" title="Forward">▶</button>' +
      '<button type="button" class="br-b" data-act="home" title="Home (the post)">⌂ Home</button>' +
      '<input class="br-addr" type="text" spellcheck="false" aria-label="Address bar"><button type="button" class="br-b" data-act="go">Go</button></div>' +
      '<div class="br-view"></div><div class="br-status">Done</div>';
    els = { tabs: body.querySelector('.br-tabs'), view: body.querySelector('.br-view'), addr: body.querySelector('.br-addr'),
      back: body.querySelector('[data-act=back]'), fwd: body.querySelector('[data-act=fwd]'), status: body.querySelector('.br-status') };

    body.addEventListener('click', function (e) {
      var a = e.target.closest('a'), act = e.target.closest('[data-act]'), tabEl = e.target.closest('[data-tab]'), x = e.target.closest('[data-close]');
      var b = B(), t = tab();
      if (x) { b.tabs.splice(+x.getAttribute('data-close'), 1); b.active = Math.max(0, Math.min(b.active, b.tabs.length - 1)); C.state.emit('browse'); return; }
      if (e.target.closest('.br-new')) { b.tabs.push({ h: ['search:'], i: 0 }); b.active = b.tabs.length - 1; C.state.emit('browse'); return; }
      if (tabEl) { b.active = +tabEl.getAttribute('data-tab'); C.state.emit('browse'); return; }
      if (act) {
        var k = act.getAttribute('data-act');
        if (k === 'back' && t.i > 0) { t.i--; C.state.emit('browse'); }
        else if (k === 'fwd' && t.i < t.h.length - 1) { t.i++; C.state.emit('browse'); }
        else if (k === 'home') go('post');
        else if (k === 'go') submitAddr();
        return;
      }
      if (a && els.view.contains(a)) {
        e.preventDefault();
        var dg = a.getAttribute('data-go');
        go(dg !== null ? dg : parseHref(a.getAttribute('href') || ''));
      }
    });
    els.view.addEventListener('submit', function (e) {
      var f = e.target.closest('[data-search]');
      if (!f) return;
      e.preventDefault(); go('search:' + f.q.value.trim());
    });
    els.view.addEventListener('mouseover', function (e) {
      var a = e.target.closest('a');
      els.status.textContent = a ? (a.getAttribute('data-go') !== null ? 'Opening page in this simulation' : (a.getAttribute('href') || '')) : 'Done';
    });
    els.addr.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitAddr(); });
    function submitAddr() {
      var v = els.addr.value.trim();
      if (!v) return;
      var r = parseHref(v);
      if (r.indexOf('notfound:') === 0) r = (/^\S+\.\S+$/.test(v)) ? r : 'search:' + v;
      go(r);
    }
    C.state.on(function (what) { if (what === 'browse') render(); });
    render();
  }

  C.browser = {
    build: build,
    /* Open a route (e.g. 'page:calder-article') from elsewhere, such as the results window. */
    open: function (route) { C.wm.open('browser'); go(route); render(); },
    routeFor: function (pageId) { return 'page:' + pageId; }
  };
})(window.Credible);
