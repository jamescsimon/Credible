/* Illustrated "photograph" generator. A puzzle's images_json cell holds scene parameters; this draws them as inline SVG. */
(function (C) {
  function scene(o) {
    var wins = '';
    for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) {
      wins += '<rect x="' + (28 + c * 44) + '" y="' + (70 + r * 52) + '" width="26" height="32" fill="#' + ((r + c) % 3 ? '3d4a57' : '55616d') + '"/>';
      wins += '<rect x="' + (452 + c * 52) + '" y="' + (60 + r * 54) + '" width="30" height="34" fill="#' + ((r * c) % 2 ? '3d4a57' : '55616d') + '"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" role="img" aria-label="' + o.alt + '" preserveAspectRatio="xMidYMid slice">' +
      '<defs><linearGradient id="sk' + o.id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7f8a94"/><stop offset="1" stop-color="#b6bec4"/></linearGradient>' +
      '<linearGradient id="wt' + o.id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d6f58"/><stop offset="1" stop-color="#5a5042"/></linearGradient></defs>' +
      '<rect width="640" height="420" fill="url(#sk' + o.id + ')"/>' +
      '<rect x="10" y="40" width="170" height="250" fill="' + o.left + '"/>' + wins +
      '<rect x="440" y="30" width="190" height="260" fill="' + o.right + '"/>' +
      '<rect x="196" y="140" width="230" height="150" fill="#8c9399"/>' +
      '<rect x="205" y="215" width="92" height="75" fill="#41505f"/><rect x="305" y="215" width="112" height="75" fill="#41505f"/>' +
      '<rect x="212" y="170" width="205" height="30" fill="' + o.shopColor + '"/><text x="314" y="191" text-anchor="middle" font-family="Georgia,serif" font-size="16" fill="#f4efe0">' + o.shop + '</text>' +
      '<polygon points="0,290 640,290 640,420 0,420" fill="#6b6f73"/>' +
      '<polygon points="0,300 640,300 640,420 0,420" fill="url(#wt' + o.id + ')" opacity="0.93"/>' +
      '<g opacity="0.35" stroke="#d8d0bd" stroke-width="2" fill="none"><path d="M20 330 q40 -8 80 0 t80 0 t80 0"/><path d="M300 372 q50 -9 100 0 t100 0 t100 0"/><path d="M60 400 q40 -8 80 0 t80 0"/></g>' +
      '<rect x="318" y="238" width="6" height="52" fill="#333"/><rect x="262" y="196" width="118" height="34" rx="3" fill="#1f5f3a"/>' +
      '<text x="321" y="219" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="17" fill="#fff">' + o.sign + '</text>' +
      '<g><rect x="80" y="318" width="150" height="46" rx="14" fill="#a8312b"/><rect x="104" y="296" width="96" height="30" rx="10" fill="#8d2823"/><rect x="108" y="300" width="40" height="20" fill="#6b8ca3"/><rect x="152" y="300" width="40" height="20" fill="#6b8ca3"/></g>' +
      '<rect x="70" y="342" width="170" height="40" fill="#6a5f4d" opacity="0.8"/>' +
      '<rect x="540" y="296" width="5" height="70" fill="#2b2b2b"/><circle cx="542" cy="294" r="9" fill="#e7dfa8"/>' +
      '</svg>';
  }

  /* spec: {kind:"scene", ...params} draws an illustration; {kind:"image", src, alt} embeds a picture by URL. */
  C.drawImage = function (spec) {
    if (spec && spec.kind === 'image') {
      var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
      return '<img src="' + esc(spec.src) + '" alt="' + esc(spec.alt || '') + '">';
    }
    return scene(spec);
  };
})(window.Credible);
