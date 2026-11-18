/* Taskbar clock -> "Date and Time Properties" calendar. Picking a day "time travels": the game reloads with that day's question
   (?date=YYYY-MM-DD). For testing; games played on another day are never reported to the shared statistics. */
(function (C) {
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); };
  var parts = C.view.split('-').map(Number);
  var st = { y: parts[0], m: parts[1] - 1, sel: C.view };
  var el, btn;

  function render() {
    var first = new Date(st.y, st.m, 1).getDay(), dim = new Date(st.y, st.m + 1, 0).getDate(), cells = '', i;
    for (i = 0; i < first; i++) cells += '<span class="cal-x"></span>';
    for (i = 1; i <= dim; i++) {
      var d = iso(st.y, st.m, i);
      cells += '<button type="button" class="cal-d' + (d === st.sel ? ' sel' : '') + (d === C.today ? ' today' : '') + (C.playable.indexOf(d) >= 0 ? ' has' : '') +
        '" data-d="' + d + '" aria-pressed="' + (d === st.sel) + '" aria-label="' + MONTHS[st.m] + ' ' + i + ', ' + st.y + (C.playable.indexOf(d) >= 0 ? ', has a question' : '') + '">' + i + '</button>';
    }
    el.querySelector('.cal-grid').innerHTML = cells;
    el.querySelector('.cal-m').value = st.m;
    el.querySelector('.cal-y').value = st.y;
    el.querySelector('.cal-note').innerHTML = C.timeTravel
      ? '⏪ <b>Time travel:</b> viewing ' + C.view + '. Games played on another day are not sent to the shared statistics.'
      : 'Pick a day to load that day’s question (for testing). <span class="cal-dot">●</span> = a question is playable that day.';
    el.querySelector('.cal-go').disabled = st.sel === C.view;
  }

  function tickTime() {
    var d = new Date(), h = d.getHours() % 12 || 12;
    var t = el && el.querySelector('.cal-time');
    if (t) t.textContent = h + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ' ' + (d.getHours() < 12 ? 'AM' : 'PM');
  }

  function open() {
    parts = C.view.split('-').map(Number); st = { y: parts[0], m: parts[1] - 1, sel: C.view };
    render(); tickTime(); el.hidden = false; btn.setAttribute('aria-expanded', 'true');
    var s = el.querySelector('.cal-d.sel') || el.querySelector('.cal-d'); if (s) s.focus();
  }
  function close() { if (el.hidden) return; el.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  function go() {
    if (st.sel === C.view) return close();
    location.href = location.pathname + (st.sel === C.today ? '' : '?date=' + st.sel);
  }
  function shift(dm) { st.m += dm; if (st.m < 0) { st.m = 11; st.y--; } if (st.m > 11) { st.m = 0; st.y++; } render(); }

  function build() {
    btn = document.getElementById('tray-clock');
    el = document.createElement('div'); el.id = 'cal'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Date and Time Properties');
    el.innerHTML =
      '<div class="cal-title"><span>Date and Time Properties</span><button type="button" class="cal-close" data-a="close" aria-label="Close">×</button></div>' +
      '<div class="cal-tab"><span>Date &amp; Time</span></div>' +
      '<div class="cal-body"><fieldset class="cal-field"><legend>Date</legend>' +
      '<div class="cal-nav"><button type="button" class="cal-arrow" data-a="prev" aria-label="Previous month">◀</button>' +
      '<select class="cal-m" aria-label="Month">' + MONTHS.map(function (n, i) { return '<option value="' + i + '">' + n + '</option>'; }).join('') + '</select>' +
      '<input class="cal-y" type="number" min="2000" max="2100" aria-label="Year">' +
      '<button type="button" class="cal-arrow" data-a="next" aria-label="Next month">▶</button></div>' +
      '<div class="cal-week"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>' +
      '<div class="cal-grid"></div></fieldset>' +
      '<fieldset class="cal-field cal-clock"><legend>Time</legend><div class="cal-time">--:--:--</div></fieldset></div>' +
      '<div class="cal-note small"></div>' +
      '<div class="cal-btns"><button type="button" class="xp-btn" data-a="today">Today</button><button type="button" class="xp-btn cal-go" data-a="go">OK</button><button type="button" class="xp-btn" data-a="close">Cancel</button></div>';
    document.body.appendChild(el);

    btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function (e) { e.stopPropagation(); if (el.hidden) open(); else close(); });
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      var d = e.target.closest('[data-d]'), a = e.target.closest('[data-a]');
      if (d) { st.sel = d.getAttribute('data-d'); render(); var n = el.querySelector('.cal-d.sel'); if (n) n.focus(); return; }
      if (!a) return;
      var k = a.getAttribute('data-a');
      if (k === 'close') close();
      else if (k === 'prev') shift(-1);
      else if (k === 'next') shift(1);
      else if (k === 'today') { var t = C.today.split('-').map(Number); st = { y: t[0], m: t[1] - 1, sel: C.today }; render(); }
      else if (k === 'go') go();
    });
    el.addEventListener('dblclick', function (e) { if (e.target.closest('[data-d]')) go(); });
    el.querySelector('.cal-m').addEventListener('change', function (e) { st.m = +e.target.value; render(); });
    el.querySelector('.cal-y').addEventListener('change', function (e) { var y = +e.target.value; if (y >= 2000 && y <= 2100) { st.y = y; } render(); });
    document.addEventListener('pointerdown', function (e) { if (!el.hidden && !el.contains(e.target) && !btn.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    setInterval(tickTime, 1000);
  }
  C.calendar = { open: function () { if (el.hidden) open(); }, close: close };
  build();
})(window.Credible);
