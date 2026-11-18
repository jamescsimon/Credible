#!/usr/bin/env node
/* Credible page proxy (no dependencies, Node 18+).  Run:  node proxy/server.js
 *
 * Many news sites refuse to be shown inside an iframe (X-Frame-Options / CSP frame-ancestors). This server fetches a page
 * on the player's behalf, drops those headers, and rewrites links so that every click stays inside the proxy. It also
 * tells the Credible page which address was loaded (postMessage), so in-article navigation lands in the History.
 *
 *   http://localhost:8787/?url=<encoded address>   the proxied page
 *   http://localhost:8000/                         the Credible app itself (served from the parent folder)
 *
 * The proxy MUST live on a different origin from the app (different port or host); the app checks this.
 * Safety: only http(s); addresses that resolve to private/loopback/link-local ranges are refused (set PROXY_ALLOW_PRIVATE=1
 * only for tests); 25 MB / 20 s limits; cookies are never forwarded or stored. It is still an open fetcher, so do not
 * expose it on the public internet without adding access control.
 */
const http = require('http'), fs = require('fs'), path = require('path'), dns = require('dns').promises, net = require('net');
const PORT = +process.env.PROXY_PORT || 8787, APP_PORT = +process.env.APP_PORT || 8000;
const ALLOW_PRIVATE = process.env.PROXY_ALLOW_PRIVATE === '1';
const MAX_BYTES = 25 * 1024 * 1024, TIMEOUT = 20000;
const APP_ROOT = path.resolve(__dirname, '..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const DROP = new Set(['x-frame-options', 'content-security-policy', 'content-security-policy-report-only', 'content-encoding', 'content-length',
  'transfer-encoding', 'connection', 'keep-alive', 'set-cookie', 'strict-transport-security', 'cross-origin-opener-policy', 'cross-origin-embedder-policy',
  'cross-origin-resource-policy', 'permissions-policy', 'report-to', 'nel', 'alt-svc', 'location', 'content-disposition']);

function isPrivateIp(ip) {
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === '::1' || l === '::') return true;
    const m = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(l); if (m) return isPrivateIp(m[1]);
    return /^f[cd]/.test(l) || /^fe[89ab]/.test(l);
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}
async function assertPublic(u) {
  if (ALLOW_PRIVATE) return;
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const ips = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map(x => x.address);
  if (!ips.length || ips.some(isPrivateIp)) throw new Error('That address points to a private network, so the proxy will not fetch it.');
}

async function fetchFollow(start) {
  let url = start;
  for (let hop = 0; hop < 6; hop++) {
    await assertPublic(url);
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT), headers: {
      'user-agent': UA, 'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8', 'accept-language': 'en-US,en;q=0.9' } });
    const loc = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && loc) { url = new URL(loc, url); if (!/^https?:$/.test(url.protocol)) throw new Error('Redirected to an unsupported address.'); continue; }
    return { res, url };
  }
  throw new Error('Too many redirects.');
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const jsStr = s => JSON.stringify(s).replace(/</g, '\u003c').replace(/\u2028/g, '\u2028').replace(/\u2029/g, '\u2029');

function errorPage(msg, target) {
  return `<!doctype html><meta charset="utf-8"><body style="font:15px Tahoma,Arial,sans-serif;padding:24px;color:#222"><h2>This page couldn’t be loaded</h2>` +
    `<p>${esc(msg)}</p><p style="color:#666">${esc(target || '')}</p><p>Try the ↗ button to open it in a new browser tab.</p></body>`;
}

/* Runs inside every proxied HTML page. */
function clientScript(proxyBase, realUrl) {
  return `<script>(function(){var P=${jsStr(proxyBase)},REAL=${jsStr(realUrl)};
function go(u){location.href=P+'/?url='+encodeURIComponent(u);}
function abs(h){try{return new URL(h,REAL).href}catch(e){return null}}
document.addEventListener('click',function(e){
  var a=e.target&&e.target.closest&&e.target.closest('a[href]');
  if(!a||e.defaultPrevented||e.button||e.ctrlKey||e.metaKey||e.shiftKey||a.hasAttribute('download'))return;
  var raw=a.getAttribute('href')||'';
  if(raw.charAt(0)==='#'){e.preventDefault();var id=decodeURIComponent(raw.slice(1)),t=id&&(document.getElementById(id)||document.getElementsByName(id)[0]);if(t)t.scrollIntoView();else if(!id)scrollTo(0,0);return;}
  var u=abs(raw);if(!u||!/^https?:/i.test(u))return;
  e.preventDefault();go(u);
},true);
document.addEventListener('submit',function(e){
  var f=e.target;if(!f||(f.method||'get').toLowerCase()!=='get')return;
  e.preventDefault();var q=new URLSearchParams(new FormData(f)).toString(),u=abs(f.getAttribute('action')||REAL);if(!u)return;
  go(u.split('#')[0].split('?')[0]+(q?'?'+q:''));
},true);
function hello(){try{parent.postMessage({credible:'loaded',url:REAL,title:document.title||''},'*')}catch(e){}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hello);else hello();
addEventListener('load',hello);
})();</script>`;
}

function decode(buf, ct) {
  let cs = (/charset=([\w-]+)/i.exec(ct || '') || [])[1];
  if (!cs) cs = (/<meta[^>]+charset=["']?([\w-]+)/i.exec(buf.subarray(0, 4096).toString('latin1')) || [])[1];
  try { return new TextDecoder(cs || 'utf-8').decode(buf); } catch (e) { return buf.toString('utf8'); }
}

async function proxy(req, res, reqUrl) {
  const target = reqUrl.searchParams.get('url');
  const origin = (req.headers['x-forwarded-proto'] || 'http') + '://' + req.headers.host;
  const send = (code, type, body, extra) => { res.writeHead(code, Object.assign({ 'content-type': type, 'cache-control': 'no-store' }, extra)); res.end(body); };
  if (reqUrl.searchParams.has('ping')) return send(200, 'text/plain', 'ok', { 'access-control-allow-origin': '*' });
  let u;
  try { u = new URL(target); if (!/^https?:$/.test(u.protocol)) throw 0; } catch (e) { return send(400, 'text/html; charset=utf-8', errorPage('That is not a web address.', target)); }
  try {
    const { res: up, url } = await fetchFollow(u);
    const ct = up.headers.get('content-type') || 'application/octet-stream';
    const len = +up.headers.get('content-length') || 0;
    if (len > MAX_BYTES) return send(413, 'text/html; charset=utf-8', errorPage('That file is too large.', url.href));
    const buf = Buffer.from(await up.arrayBuffer());
    if (buf.length > MAX_BYTES) return send(413, 'text/html; charset=utf-8', errorPage('That file is too large.', url.href));
    if (/^text\/html|application\/xhtml/i.test(ct)) {
      const raw = decode(buf, ct);
      let html = raw
        .replace(/<meta[^>]+http-equiv=["']?content-security-policy[^>]*>/gi, '')
        .replace(/<base\b[^>]*>/gi, '');
      const inject = `<base href="${esc(url.href)}">` + clientScript(origin, url.href);
      html = /<head\b[^>]*>/i.test(html) ? html.replace(/<head\b[^>]*>/i, m => m + inject) : inject + html;
      return send(up.status, 'text/html; charset=utf-8', html);
    }
    const headers = {};
    up.headers.forEach((v, k) => { if (!DROP.has(k.toLowerCase())) headers[k] = v; });
    headers['cache-control'] = 'no-store';
    res.writeHead(up.status, headers); res.end(buf);
  } catch (e) {
    send(502, 'text/html; charset=utf-8', errorPage(e.name === 'TimeoutError' ? 'The site took too long to answer.' : (e.message || 'The site could not be reached.'), target));
  }
}

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '')) return proxy(req, res, u);
  res.writeHead(404); res.end('Not found');
}).listen(PORT, () => console.log('Credible proxy:  http://localhost:' + PORT + '/?url=<address>'));

/* The app itself, so one command starts everything. */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.csv': 'text/csv', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon', '.txt': 'text/plain' };
if (!process.env.NO_APP) {
  http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
    const f = path.resolve(APP_ROOT, '.' + p);
    if (!f.startsWith(APP_ROOT + path.sep) || /[\\/](proxy|sheets|\.git)[\\/]/.test(f)) { res.writeHead(403); return res.end('Forbidden'); }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end('Not found'); } else { res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(d); } });
  }).listen(APP_PORT, () => console.log('Credible app:    http://localhost:' + APP_PORT + '/'));
}
