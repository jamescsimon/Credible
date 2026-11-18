/* Boot: desktop icons, windows, Start menu, clock, completion handling. */
(function (C) {
  var I = C.icons, S = C.state.get();
  var $ = function (id) { return document.getElementById(id); };

  // ---- Windows ----
  C.wm.define({ id: 'browser', title: 'Internet Browser', icon: '<span class="mini">' + I.browser + '</span>', w: 780, h: 580, open: true,
    pos: function (vw, vh, s) { return { x: Math.min(100, Math.max(8, vw - s.w - 8)), y: Math.max(8, (vh - s.h) / 2 - 10) }; }, build: C.browser.build });
  C.wm.define({ id: 'control', title: 'Control Panel', icon: '<span class="mini">' + I.control + '</span>', w: 560, h: 560, open: true,
    pos: function (vw, vh, s) { return { x: Math.max(8, vw - s.w - 24), y: Math.max(8, (vh - s.h) / 2 - 10) }; }, build: C.controlPanel.build });
  C.wm.define({ id: 'taskmgr', title: 'Task Manager', icon: '<span class="mini">' + I.taskmgr + '</span>', w: 480, h: 440,
    pos: function (vw, vh, s) { return { x: (vw - s.w) / 2, y: Math.max(8, (vh - s.h) / 2) }; }, build: C.taskManager.build });
  C.wm.define({ id: 'timer', title: 'Alarm Clock', icon: '<span class="mini">' + I.clock + '</span>', w: 190, h: 118, widget: true, open: true,
    pos: function (vw, vh, s) { return { x: 16, y: vh - s.h - 12 }; }, build: C.widgets.buildTimer });
  C.wm.define({ id: 'media', title: 'Media Player', icon: '<span class="mini">' + I.media + '</span>', w: 300, h: 168, widget: true, open: true,
    pos: function (vw, vh, s) { return { x: vw - s.w - 16, y: vh - s.h - 12 }; }, build: C.widgets.buildMedia });
  C.wm.define({ id: 'help', title: 'Instructions', icon: '<span class="mini">' + I.info + '</span>', w: 460, h: 460, open: !S.welcomed,
    pos: function (vw, vh, s) { return { x: (vw - s.w) / 2, y: Math.max(8, (vh - s.h) / 2) }; }, build: C.info.buildHelp });
  C.wm.define({ id: 'credits', title: 'Credits', icon: '<span class="mini">' + I.credits + '</span>', w: 460, h: 420,
    pos: function (vw, vh, s) { return { x: (vw - s.w) / 2 + 30, y: Math.max(8, (vh - s.h) / 2 + 20) }; }, build: C.info.buildCredits });
  S.welcomed = true;

  // ---- Desktop icons ----
  var desktopApps = [['browser', 'Internet Browser', I.browser], ['control', 'Control Panel', I.control], ['taskmgr', 'Task Manager', I.taskmgr], ['help', 'Instructions', I.info]];
  $('icons').innerHTML = desktopApps.map(function (a) {
    return '<button type="button" class="d-icon" data-open="' + a[0] + '">' + a[2] + '<span>' + a[1] + '</span></button>';
  }).join('');
  $('icons').addEventListener('dblclick', function (e) { var b = e.target.closest('[data-open]'); if (b) C.wm.open(b.getAttribute('data-open')); });
  $('icons').addEventListener('click', function (e) {
    var b = e.target.closest('[data-open]');
    document.querySelectorAll('.d-icon.sel').forEach(function (x) { x.classList.remove('sel'); });
    if (b) { b.classList.add('sel'); if (matchMedia('(pointer:coarse)').matches) C.wm.open(b.getAttribute('data-open')); }
  });
  $('icons').addEventListener('keydown', function (e) { if (e.key === 'Enter') { var b = e.target.closest('[data-open]'); if (b) C.wm.open(b.getAttribute('data-open')); } });

  // ---- Start menu ----
  var menu = $('start-menu'), sb = $('start-btn');
  var left = [['browser', 'Internet Browser', I.browser], ['control', 'Control Panel', I.control], ['taskmgr', 'Task Manager', I.taskmgr], ['media', 'Media Player', I.media], ['timer', 'Alarm Clock', I.clock]];
  var right = [['help', 'Instructions', I.info], ['credits', 'Credits', I.credits]];
  function items(list) { return list.map(function (a) { return '<li><button type="button" data-open="' + a[0] + '"><span class="mini">' + a[2] + '</span>' + a[1] + '</button></li>'; }).join(''); }
  $('sm-apps').innerHTML = items(left);
  $('sm-system').innerHTML = items(right);
  function toggleMenu(show) {
    var on = typeof show === 'boolean' ? show : menu.hidden;
    menu.hidden = !on; sb.classList.toggle('open', on);
    if (on) C.sound.play('click');
  }
  sb.addEventListener('click', function (e) { e.stopPropagation(); toggleMenu(); });
  menu.addEventListener('click', function (e) {
    e.stopPropagation();
    var b = e.target.closest('[data-open]');
    if (b) { C.wm.open(b.getAttribute('data-open')); toggleMenu(false); }
  });
  $('sm-reset').addEventListener('click', function () {
    toggleMenu(false);
    if (window.confirm('Reset the demo? This clears your guesses, timer and browsing history for this puzzle.')) C.game.reset();
  });
  document.addEventListener('pointerdown', function (e) { if (!menu.hidden && !menu.contains(e.target) && e.target !== sb) toggleMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggleMenu(false); });
  $('tray-sound').addEventListener('click', function () { C.wm.open('media'); });

  // ---- Clock ----
  function clock() {
    var d = new Date(), h = d.getHours() % 12 || 12, m = d.getMinutes();
    var t = h + ':' + (m < 10 ? '0' : '') + m + ' ' + (d.getHours() < 12 ? 'AM' : 'PM');
    // while time-travelling, show the day being played so it is never a surprise
    $('tray-clock').textContent = (C.timeTravel ? '⏪ ' + C.view.slice(5).replace('-', '/') + ' · ' : '') + t;
    $('tray-clock').classList.toggle('tt', C.timeTravel);
    $('tray-clock').title = C.timeTravel ? 'Time travel: playing ' + C.view + '. Click to change the day.' : 'Date and time (click to change day)';
  }
  clock(); setInterval(clock, 15000);

  // ---- Completion: open the results window once ----
  C.state.on(function (what) {
    if ((what === 'solved' || what === 'failed') && !S.resultSeen) {
      S.resultSeen = true; C.state.save();
      setTimeout(function () { C.wm.open('taskmgr'); }, 900);
    }
  });
  if (C.game.isOver() && !S.resultSeen) { S.resultSeen = true; C.wm.open('taskmgr'); }

  C.wm.initialFocus();
  C.state.save();
})(window.Credible);
