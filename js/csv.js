/* Minimal RFC 4180 CSV parser: quoted fields, doubled quotes, embedded commas and newlines. */
(function (C) {
  function parse(text) {
    var rows = [], row = [], f = '', q = false, i = 0, c;
    text = text.replace(/^﻿/, '');
    for (; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(f); f = ''; rows.push(row); row = [];
      } else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows.filter(function (r) { return r.length > 1 || r[0] !== ''; });
  }
  /* -> array of {header: value} objects */
  function objects(text) {
    var rows = parse(text), head = rows.shift() || [];
    return rows.map(function (r) { var o = {}; head.forEach(function (h, i) { o[h.trim()] = r[i] === undefined ? '' : r[i]; }); return o; });
  }
  C.csv = { parse: parse, objects: objects };
})(window.Credible);
