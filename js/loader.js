/* Loads the question of the day, then starts the app.
   The question is authored as plain text in ONE table: every row has a date and a `part` (answer, post, reply, page, ...).
   This file turns the day's rows into the puzzle object the interface reads.
   Source: config.sheetUrl (Apps Script web app, returns that day's rows) or config.localFile (a CSV of the same table). */
(function (C) {
  var cfg = C.config;
  var APP = ['js/state.js', 'js/stats.js', 'js/sound.js', 'js/icons.js', 'js/wm.js', 'js/apps/browser.js', 'js/apps/control.js',
    'js/apps/taskmgr.js', 'js/apps/widgets.js', 'js/apps/info.js', 'js/main.js'];

  // ---------- helpers ----------
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var str = function (v) { return v === undefined || v === null ? '' : String(v).trim(); };
  var num = function (v) { var n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : 0; };
  var slug = function (s) { return str(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x'; };
  var key = function (s) { return str(s).toLowerCase().replace(/[^a-z0-9]/g, ''); };
  var handleOf = function (s) { return str(s).replace(/^@/, '').toLowerCase(); };
  var PALETTE = ['#c0504d', '#5a7fb5', '#7a6a3b', '#2f8f83', '#6b3b7a', '#a0622d', '#3f7a45', '#8a4a6a'];
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  var pick = function (arr, s) { return arr[hash(s) % arr.length]; };

  function today() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function wantedDate() {
    var m = /[?&]date=(\d{4}-\d{2}-\d{2})/.exec(location.search);
    return (m && m[1]) || cfg.puzzleDate || today();
  }
  function isoDate(v) { // tolerate Sheets turning 2026-11-17 into 11/17/2026
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str(v));
    return m ? m[3] + '-' + (m[1].length < 2 ? '0' : '') + m[1] + '-' + (m[2].length < 2 ? '0' : '') + m[2] : str(v);
  }

  /* Plain text -> HTML. Blank line = new paragraph. A paragraph where every line looks like "Label: value" becomes a table.
     Web addresses become links. */
  function linkify(t) {
    return t.replace(/((?:https?:\/\/)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.example\/[^\s<]*[^\s<.,;)])/gi, function (u) {
      return '<a href="' + (/^https?:/i.test(u) ? u : 'https://' + u) + '">' + u + '</a>';
    });
  }
  function textToHtml(text, afterFirst) {
    var paras = str(text).replace(/\r/g, '').split(/\n\s*\n/).filter(function (p) { return p.trim(); });
    return paras.map(function (p, i) {
      var lines = p.split('\n').map(function (l) { return l.trim(); }).filter(Boolean), html;
      if (lines.length > 1 && lines.every(function (l) { return /^[^:]{1,45}: \S/.test(l); })) {
        html = '<table class="kv">' + lines.map(function (l) { var k = l.indexOf(': '); return '<tr><th>' + esc(l.slice(0, k)) + '</th><td>' + linkify(esc(l.slice(k + 2))) + '</td></tr>'; }).join('') + '</table>';
      } else html = '<p>' + linkify(esc(lines.join('\n'))).replace(/\n/g, '<br>') + '</p>';
      return html + (i === 0 && afterFirst ? afterFirst : '');
    }).join('');
  }

  function need(row, cols, what) {
    var miss = cols.filter(function (c) { return !str(row[c]); });
    if (miss.length) throw new Error('A “' + what + '” row for ' + row.date + ' is missing: ' + miss.join(', ') + '.');
  }
  function categoryId(v, what) {
    var k = key(v), c = C.categories.filter(function (x) { return key(x.id) === k || key(x.name) === k; })[0];
    if (!c) throw new Error('“' + v + '” is not a category name (' + what + '). Use one of: ' + C.categories.map(function (x) { return x.name; }).join('; ') + '.');
    return c.id;
  }

  // ---------- rows -> puzzle ----------
  /* rows: every row of the one table, each {column header: text}. A row's `part` says what it is. */
  var PAGE_PARTS = { 'page': 'plain', 'news page': 'news', 'government page': 'gov', 'weather page': 'weather' };

  function build(allRows, date) {
    allRows.forEach(function (r) { r.date = isoDate(r.date); r.part = str(r.part).toLowerCase().replace(/\s+/g, ' '); });
    var days = allRows.filter(function (r) { return r.part === 'answer' && r.date; }).map(function (r) { return r.date; }).sort();
    var day = days.indexOf(date) >= 0 ? date : (days.filter(function (d) { return d <= date; }).pop() || days[0]);
    if (!day) throw new Error('The sheet has no “answer” row to play.');
    var mine = allRows.filter(function (r) { return r.date === day; });
    var of = function (part) { return mine.filter(function (r) { return r.part === part; }); };
    var one = function (part) {
      var r = of(part)[0];
      if (!r) throw new Error('Date ' + day + ' has no “' + part + '” row.');
      return r;
    };
    var ans = one('answer'), post = one('post');
    need(ans, ['name'], 'answer'); need(post, ['name', 'text'], 'post');
    var explanation = str(one('explanation').text);
    if (!explanation) throw new Error('The “explanation” row has no text.');

    // images
    var images = {}, imgInfo = {};
    of('image').forEach(function (r) {
      var k = key(r.name); if (!k) return;
      var alt = str(r.text);
      imgInfo[k] = { caption: str(r.detail), alt: alt };
      images[k] = C.drawImage(str(r.link) ? { kind: 'image', src: str(r.link), alt: alt } : {
        kind: 'scene', id: slug(r.name), alt: alt, sign: str(r.title) || 'MAIN ST', shop: str(r.site) || 'General Store',
        left: pick(['#6d5a4f', '#5e6e57', '#6a5560', '#58626e'], k), right: pick(['#4d5a66', '#6f6a5a', '#56655c'], k + 'r'), shopColor: pick(['#7a2e2e', '#2f4f6f', '#3e5f3f', '#5b3f6b'], k + 's')
      });
    });
    function imageKey(name) {
      var k = key(name);
      if (k && !images[k]) throw new Error('Picture “' + name + '” has no “image” row for ' + day + '.');
      return k;
    }

    // people (title = display name, text = bio)
    var profiles = {};
    function person(handle, r) {
      var h = handleOf(handle);
      return profiles[h] = profiles[h] || { name: str(r && r.title) || h, handle: h, url: 'chirper.example/' + h, bio: str(r && r.text), location: '', joined: '', followers: '', following: '',
        color: pick(PALETTE, h), posts: [] };
    }
    of('person').forEach(function (r) { if (str(r.name)) person(r.name, r); });
    var author = handleOf(post.name);
    person(author, null);

    var comments = [];
    of('reply').forEach(function (r) {
      var h = handleOf(r.name); if (!h || !str(r.text)) return;
      comments.push({ handle: h, name: person(h, null).name, time: str(r.detail), html: linkify(esc(str(r.text))) });
    });
    of('earlier post').forEach(function (r) {
      var h = handleOf(r.name); if (!h || !str(r.text)) return;
      person(h, null).posts.push({ time: str(r.detail), text: str(r.text) });
    });

    // pages
    var pages = {}, byTitle = {}, entries = [], used = {};
    mine.filter(function (r) { return PAGE_PARTS[r.part]; }).forEach(function (r) {
      need(r, ['title', 'site', 'text'], r.part);
      var id = slug(r.title), n = 2; while (used[id]) id = slug(r.title) + '-' + n++;
      used[id] = 1; byTitle[key(r.title)] = id;
      var fig = '';
      if (str(r.image)) { var ik = imageKey(r.image); fig = '{{image:' + ik + '|' + (imgInfo[ik].caption || '').replace(/[}|]/g, '') + '}}'; }
      var url = str(r.link) || (slug(r.site) + '.example/' + slug(r.title));
      pages[id] = { theme: PAGE_PARTS[r.part], site: str(r.site), url: url, title: str(r.title), meta: str(r.detail), body: textToHtml(r.text, fig) };
      var flat = str(r.text).replace(/\s+/g, ' '), words = (str(r.keywords) + ' ' + r.site).toLowerCase().split(/[\s,;]+/).filter(Boolean);
      entries.push({ page: id, snippet: flat.length > 170 ? flat.slice(0, 167).replace(/\s\S*$/, '') + '…' : flat, keywords: words });
    });
    var decisive = of('key evidence').map(function (r) {
      var id = byTitle[key(r.title)];
      if (!id) throw new Error('A “key evidence” row refers to a page titled “' + r.title + '”, which is not in the sheet for ' + day + '.');
      return { page: id, why: str(r.text) };
    });
    var ap = profiles[author];
    entries.push({ route: 'profile:' + author, title: ap.name + ' (@' + author + ') — Chirper', url: ap.url, snippet: ap.bio || ('Posts by @' + author),
      keywords: ap.name.toLowerCase().split(/\s+/).concat([author, author.replace(/_.*/, ''), 'author', 'profile', 'account', 'chirper']) });

    var feedback = {};
    of('hint').forEach(function (r) { if (str(r.name) && str(r.text)) feedback[categoryId(r.name, 'hint rows')] = str(r.text); });

    var imgKey = str(post.image) ? imageKey(post.image) : '';
    return {
      id: day, date: day, answer: categoryId(ans.name, 'answer row'),
      platform: { name: 'Chirper', tagline: 'what’s happening' },
      images: images,
      post: { id: 'post', url: 'chirper.example/' + author + '/status/' + (10000 + hash(day + author) % 90000), author: author, time: str(post.detail), text: str(post.text),
        image: imgKey, imageAlt: imgKey ? imgInfo[imgKey].alt : '', commentsTotal: comments.length },
      profiles: profiles, comments: comments, pages: pages,
      search: { siteName: 'FindIt', tips: 'Try a place, a year, a name, or what the picture shows.', entries: entries },
      feedback: feedback,
      result: { explanation: explanation, decisive: decisive, tactic: str(one('tactic').text) },
      stats: { completed: num(ans.players_completed), solved: num(ans.players_solved), avgGuesses: num(ans.avg_guesses), avgTimeSec: num(ans.avg_time_sec) }
    };
  }

  // ---------- fetching ----------
  function fetchText(url) {
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error(url + ' returned HTTP ' + res.status);
      return res.text();
    });
  }
  function fromSheet(date) {
    var u = cfg.sheetUrl + (cfg.sheetUrl.indexOf('?') < 0 ? '?' : '&') + 'date=' + date;
    return fetchText(u).then(function (t) {
      var d; try { d = JSON.parse(t); } catch (e) { throw new Error('The sheet web app did not return data (is it deployed with access “Anyone”?).'); }
      if (d.error) throw new Error('Sheet: ' + d.error);
      return d.rows;
    });
  }
  function fromFile() { return fetchText(cfg.localFile).then(function (x) { return C.csv.objects(x); }); }
  function load() {
    var date = wantedDate();
    var src = cfg.sheetUrl ? fromSheet(date).catch(function (e) { if (!cfg.localFile) throw e; console.warn(e.message + ' Using the local file.'); return fromFile(); }) : fromFile();
    return src.then(function (rows) { return build(rows, date); });
  }

  // ---------- boot ----------
  function show(msg) {
    var b = document.getElementById('boot'); if (!b) return;
    b.hidden = false; b.innerHTML = msg;
  }
  function inject(list, done) {
    var s = list.shift(); if (!s) return done();
    var el = document.createElement('script'); el.src = s;
    el.onload = function () { inject(list, done); };
    el.onerror = function () { show('<b>Could not load ' + s + '</b>'); };
    document.body.appendChild(el);
  }

  show('Loading today’s question…');
  load().then(function (p) {
    C.puzzle = p;
    inject(APP.slice(), function () { document.getElementById('boot').hidden = true; });
  }, function (e) {
    var file = location.protocol === 'file:';
    show('<b>Couldn’t load the question of the day.</b><p>' + esc(e.message) + '</p>' +
      (file ? '<p>Browsers block reading local files from a <code>file://</code> page. Set <code>sheetUrl</code> in <code>data/config.js</code>, or serve this folder, e.g. <code>python -m http.server</code>, and open <code>http://localhost:8000</code>.</p>' : ''));
  });
})(window.Credible);
