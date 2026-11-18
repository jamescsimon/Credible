/* Tiny WebAudio synth for UI sounds. No audio files are needed. Honors mute/volume from state. */
(function (C) {
  var ctx = null;
  var NOTES = {
    click: [[880, 0.04]],
    open: [[523, 0.06], [659, 0.08]],
    right: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.22]],
    wrong: [[330, 0.14], [247, 0.26]],
    chime: [[784, 0.12], [988, 0.12], [1175, 0.2]]
  };
  function play(name) {
    var S = C.state.get();
    if (S.sound.muted || S.sound.volume <= 0) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = ctx || new AC();
      if (ctx.state === 'suspended') ctx.resume();
      var t = ctx.currentTime;
      (NOTES[name] || NOTES.click).forEach(function (n) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.25 * S.sound.volume), t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + n[1]);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + n[1] + 0.02);
        t += n[1] * 0.9;
      });
    } catch (e) { /* audio unavailable */ }
  }
  C.sound = { play: play };
})(window.Credible);
