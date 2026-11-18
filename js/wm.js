/* Window manager: focus/z-order, drag, minimize, close, reopen, keep-on-screen. */
(function (C) {
  var TASKBAR = 30, KEEP = 110; // px of a window that must stay reachable
  var defs = {}, els = {}, z = 10, activeId = null;
  var layer = document.getElementById('windows');
  var tasks = document.getElementById('tasks');

  function vw() { return window.innerWidth; }
  function vh() { return window.innerHeight - TASKBAR; }
  function ws(id) { var S = C.state.get(); return S.windows[id] || (S.windows[id] = {}); }

  function size(d) {
    return { w: Math.min(d.w, vw() - 12), h: Math.min(d.h, vh() - 12) };
  }
  function clamp(id) {
    var el = els[id], s = ws(id), d = size(defs[id]);
    var w = el.offsetWidth || d.w;
    s.x = Math.max(KEEP - w, Math.min(vw() - KEEP, s.x));
    s.y = Math.max(0, Math.min(vh() - 28, s.y));
    el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
  }

  function define(d) {
    defs[d.id] = d;
    var s = ws(d.id);
    var sz = size(d);
    if (typeof s.open === 'undefined') s.open = !!d.open;
    if (typeof s.min === 'undefined') s.min = false;
    if (typeof s.x === 'undefined') {
      var p = typeof d.pos === 'function' ? d.pos(vw(), vh(), sz) : { x: 40, y: 40 };
      s.x = p.x; s.y = p.y;
    }

    var el = document.createElement('div');
    el.className = 'win' + (d.widget ? ' widget' : '');
    el.id = 'win-' + d.id;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', d.title);
    el.style.width = sz.w + 'px';
    el.style.height = d.autoHeight ? 'auto' : sz.h + 'px';
    el.innerHTML =
      '<div class="titlebar"><span class="t-icon">' + (d.icon || '') + '</span><span class="t-text"></span>' +
      '<button class="tb-btn tb-min" type="button" title="Minimize" aria-label="Minimize">&#8211;</button>' +
      '<button class="tb-btn tb-close" type="button" title="Close" aria-label="Close">&#10005;</button></div>' +
      '<div class="winbody"></div>';
    el.querySelector('.t-text').textContent = d.title;
    layer.appendChild(el);
    els[d.id] = el;

    // Taskbar button
    var tb = document.createElement('button');
    tb.type = 'button'; tb.className = 'task-btn'; tb.id = 'task-' + d.id;
    tb.innerHTML = '<span class="t-icon">' + (d.icon || '') + '</span><span class="t-label"></span>';
    tb.querySelector('.t-label').textContent = d.title;
    tb.addEventListener('click', function () {
      var st = ws(d.id);
      if (st.min) open(d.id);
      else if (activeId === d.id) minimize(d.id);
      else focus(d.id);
    });
    tasks.appendChild(tb);

    el.addEventListener('pointerdown', function () { if (activeId !== d.id) focus(d.id); });
    el.querySelector('.tb-min').addEventListener('click', function () { minimize(d.id); });
    el.querySelector('.tb-close').addEventListener('click', function () { close(d.id); });
    el.querySelector('.titlebar').addEventListener('dblclick', function (e) {
      if (!e.target.closest('.tb-btn')) minimize(d.id);
    });
    drag(d.id);

    d.build(el.querySelector('.winbody'), el);
    clamp(d.id);
    render(d.id);
  }

  function drag(id) {
    var el = els[id], bar = el.querySelector('.titlebar');
    bar.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.tb-btn') || e.button !== 0) return;
      var s = ws(id), sx = e.clientX, sy = e.clientY, ox = s.x, oy = s.y;
      bar.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
      function move(ev) { s.x = ox + ev.clientX - sx; s.y = oy + ev.clientY - sy; clamp(id); }
      function up() {
        bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up);
        bar.removeEventListener('pointercancel', up);
        el.classList.remove('dragging'); C.state.save();
      }
      bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
    });
  }

  function render(id) {
    var s = ws(id), el = els[id], tb = document.getElementById('task-' + id);
    var shown = s.open && !s.min;
    el.style.display = shown ? '' : 'none';
    tb.style.display = s.open ? '' : 'none';
    tb.classList.toggle('active', shown && activeId === id);
    el.classList.toggle('inactive', activeId !== id);
  }
  function renderAll() { Object.keys(defs).forEach(render); }

  function focus(id) {
    var s = ws(id);
    if (!s.open || s.min) return;
    activeId = id; els[id].style.zIndex = ++z;
    renderAll();
  }
  function open(id) {
    var s = ws(id), was = s.open && !s.min;
    s.open = true; s.min = false;
    clamp(id); render(id); focus(id);
    if (!was) C.sound.play('open');
    if (defs[id].onOpen) defs[id].onOpen();
    C.state.save();
  }
  function minimize(id) {
    ws(id).min = true;
    if (activeId === id) activeId = null;
    renderAll(); C.state.save();
    // focus the top-most remaining window
    var top = null, tz = -1;
    Object.keys(els).forEach(function (k) {
      var st = ws(k);
      if (st.open && !st.min && +els[k].style.zIndex > tz) { tz = +els[k].style.zIndex; top = k; }
    });
    if (top) focus(top);
  }
  function close(id) {
    var s = ws(id); s.open = false; s.min = false;
    if (activeId === id) activeId = null;
    renderAll(); C.state.save();
  }
  function setTitle(id, t) {
    els[id].querySelector('.t-text').textContent = t;
    document.getElementById('task-' + id).querySelector('.t-label').textContent = t;
  }

  window.addEventListener('resize', function () {
    Object.keys(els).forEach(function (id) {
      var d = size(defs[id]); els[id].style.width = d.w + 'px';
      if (!defs[id].autoHeight) els[id].style.height = d.h + 'px';
      clamp(id);
    });
  });

  C.wm = {
    define: define, open: open, close: close, minimize: minimize, focus: focus, setTitle: setTitle,
    isOpen: function (id) { var s = ws(id); return !!(s.open && !s.min); },
    el: function (id) { return els[id]; },
    reflow: function () { Object.keys(els).forEach(clamp); },
    initialFocus: function () {
      var top = null, tz = -1, i = 0;
      Object.keys(defs).forEach(function (k) { var st = ws(k); i++; if (st.open && !st.min && i >= tz) { tz = i; top = k; } });
      if (top) focus(top); else renderAll();
    }
  };
})(window.Credible);
