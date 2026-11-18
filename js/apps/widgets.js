/* Desktop widgets: Alarm Clock (elapsed play time) and Media Player (sound settings). */
(function (C) {
  function buildTimer(body) {
    body.classList.add('clk');
    body.innerHTML = '<div class="clk-face"><div class="clk-led" id="clk-led">0:00</div><div class="clk-cap">time played</div></div>';
    var led = body.querySelector('#clk-led');
    function upd() { led.textContent = C.game.fmtTime(C.state.get().elapsed); }
    C.state.on(function (w) { if (w !== 'browse') upd(); });
    upd();
  }

  function buildMedia(body) {
    body.classList.add('mp');
    body.innerHTML =
      '<div class="mp-screen"><div class="mp-bars" aria-hidden="true">' + new Array(13).join('<i></i>') + '</div><div class="mp-title">alyzea – dream OS</div></div>' +
      '<div class="mp-ctl"><button type="button" class="mp-btn" data-m="play" aria-pressed="false" title="Play / pause music">&#9654;</button>' +
      '<button type="button" class="mp-btn" data-m="mute" aria-pressed="false" title="Mute sounds">&#128266;</button>' +
      '<label class="mp-vol">Volume <input type="range" min="0" max="100" step="5" aria-label="Volume"></label></div>' +
      '<div class="mp-note small">Background music: alyzea – dream OS. Feedback sounds are generated in the browser.</div>';
    var mute = body.querySelector('[data-m=mute]'), vol = body.querySelector('input'), playBtn = body.querySelector('[data-m=play]');
    var music = new Audio('images/alyzea%20-%20dream%20OS.mp3');
    music.loop = true; music.preload = 'none';
    function startMusic() {
      var s = C.state.get().sound;
      if (s.music === false) return;
      music.play().then(function () { upd(); }, function () { /* needs a user gesture first */ });
    }
    function upd() {
      var s = C.state.get().sound;
      music.volume = s.volume; music.muted = !!s.muted;
      var playing = !music.paused;
      playBtn.innerHTML = playing ? '&#10074;&#10074;' : '&#9654;'; playBtn.setAttribute('aria-pressed', String(playing));
      body.classList.toggle('playing', playing);
      mute.innerHTML = s.muted ? '&#128263;' : '&#128266;'; mute.setAttribute('aria-pressed', String(!!s.muted));
      vol.value = Math.round(s.volume * 100);
      body.classList.toggle('muted', !!s.muted || music.paused);
      var tray = document.getElementById('tray-sound'); if (tray) tray.innerHTML = s.muted ? '&#128263;' : '&#128266;';
    }
    body.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return;
      var s = C.state.get().sound;
      var k = b.getAttribute('data-m');
      if (k === 'mute') { s.muted = !s.muted; C.state.emit('sound'); }
      else if (music.paused) { s.music = true; C.state.save(); startMusic(); }
      else { s.music = false; music.pause(); upd(); C.state.save(); }
    });
    vol.addEventListener('input', function () { C.state.get().sound.volume = vol.value / 100; C.state.emit('sound'); });
    vol.addEventListener('change', function () { C.sound.play('click'); });
    C.state.on(function (w) { if (w === 'sound') upd(); });
    music.addEventListener('pause', upd); music.addEventListener('play', upd);
    // Browsers block autoplay: begin on the first click/key anywhere unless the player paused it.
    function first(e) { if (e && e.target.closest && e.target.closest('[data-m=play]')) return; document.removeEventListener('pointerdown', first); document.removeEventListener('keydown', first); startMusic(); }
    document.addEventListener('pointerdown', first); document.addEventListener('keydown', first);
    upd();
  }
  C.widgets = { buildTimer: buildTimer, buildMedia: buildMedia };
})(window.Credible);
