/* Inline SVG icons drawn for this project (RetroBar contains no application icons). */
(function (C) {
  function svg(inner) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">' + inner + '</svg>'; }
  C.icons = {
    browser: svg('<circle cx="16" cy="16" r="13" fill="#2f7be0" stroke="#0b3d91" stroke-width="2"/><path d="M5 16h22M16 3c-6 6-6 20 0 26M16 3c6 6 6 20 0 26M7 9h18M7 23h18" fill="none" stroke="#e8f3ff" stroke-width="1.6"/><path d="M4 22c8 4 18 2 24-6" fill="none" stroke="#ffd54a" stroke-width="2.4" stroke-linecap="round"/>'),
    control: svg('<rect x="3" y="5" width="26" height="22" rx="2" fill="#f2f0e0" stroke="#4c6a8f" stroke-width="2"/><rect x="3" y="5" width="26" height="6" fill="#3a78d6"/><circle cx="11" cy="19" r="4" fill="#3fa34d"/><circle cx="21" cy="19" r="4" fill="#e0a82a"/><path d="M11 17v4M9 19h4" stroke="#fff" stroke-width="1.5"/>'),
    taskmgr: svg('<rect x="2" y="4" width="28" height="20" rx="2" fill="#223" stroke="#6c7a89" stroke-width="2"/><polyline points="5,19 10,13 14,17 19,8 24,15 27,11" fill="none" stroke="#38e060" stroke-width="2"/><rect x="9" y="26" width="14" height="3" fill="#7c8794"/>'),
    media: svg('<rect x="2" y="6" width="28" height="20" rx="4" fill="#244d8f" stroke="#0e2a5a" stroke-width="2"/><circle cx="16" cy="16" r="7" fill="#e4ecf7"/><polygon points="14,12 14,20 21,16" fill="#2a6dd4"/>'),
    clock: svg('<circle cx="16" cy="17" r="11" fill="#fdfdfb" stroke="#444" stroke-width="2"/><path d="M16 17V10M16 17l5 3" stroke="#222" stroke-width="2" stroke-linecap="round"/><circle cx="7" cy="6" r="4" fill="#d9534f"/><circle cx="25" cy="6" r="4" fill="#d9534f"/>'),
    info: svg('<circle cx="16" cy="16" r="13" fill="#3a8fe8" stroke="#0b3d91" stroke-width="2"/><rect x="14.2" y="14" width="3.6" height="9" fill="#fff"/><circle cx="16" cy="10" r="2.2" fill="#fff"/>'),
    credits: svg('<rect x="5" y="3" width="22" height="26" rx="2" fill="#fff8d6" stroke="#7a6a2b" stroke-width="2"/><path d="M9 10h14M9 15h14M9 20h9" stroke="#7a6a2b" stroke-width="2"/>')
  };
})(window.Credible);
