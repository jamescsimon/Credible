/* Credible page proxy as a Cloudflare Worker (free tier is plenty). Same behaviour as proxy/server.js, for hosting the game on
 * static hosting such as GitHub Pages, which cannot run a proxy itself.
 *
 * Deploy (dashboard, no tools needed):
 *   1. dash.cloudflare.com > Workers & Pages > Create > Create Worker > Deploy, then Edit code.
 *   2. Paste this whole file, Deploy.
 *   3. Worker > Settings > Variables: add  ALLOWED_ORIGINS = https://YOURNAME.github.io   (comma-separate more; see below).
 *   4. Put the worker address (https://something.workers.dev) in data/config.js as proxyUrl, commit, push.
 *
 * ALLOWED_ORIGINS limits who can use your proxy: requests must come from a page on one of these origins (or from a page the
 * proxy itself served, so clicks inside articles keep working). Without it ANYONE can use your Worker as a free proxy, and
 * Cloudflare may suspend it for abuse, so set it.
 *
 * Only http(s); cookies are never forwarded or stored; size is capped. Cloudflare's network already cannot reach private addresses.
 */
const MAX_BYTES = 12 * 1024 * 1024;
const DROP = new Set(['x-frame-options', 'content-security-policy', 'content-security-policy-report-only', 'content-encoding', 'content-length',
  'transfer-encoding', 'connection', 'keep-alive', 'set-cookie', 'strict-transport-security', 'cross-origin-opener-policy', 'cross-origin-embedder-policy',
  'cross-origin-resource-policy', 'permissions-policy', 'report-to', 'nel', 'alt-svc', 'location', 'content-disposition']);

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const jsStr = s => JSON.stringify(s).replace(/</g, '\\u003c');

function page(code, msg, target) {
  return new Response('<!doctype html><meta charset="utf-8"><body style="font:15px Tahoma,Arial,sans-serif;padding:24px;color:#222"><h2>This page couldn’t be loaded</h2><p>' +
    esc(msg) + '</p><p style="color:#666">' + esc(target || '') + '</p><p>Try the ↗ button to open it in a new browser tab.</p></body>',
    { status: code, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

/* Runs inside every proxied HTML page: keeps clicks inside the proxy and tells the game the page's real address. */
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
  if (!cs) cs = (/<meta[^>]+charset=["']?([\w-]+)/i.exec(new TextDecoder('latin1').decode(buf.slice(0, 4096))) || [])[1];
  try { return new TextDecoder(cs || 'utf-8').decode(buf); } catch (e) { return new TextDecoder().decode(buf); }
}

function allowed(request, env, self) {
  const list = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
  if (!list.length) return true;
  const ref = request.headers.get('referer') || request.headers.get('origin') || '';
  let o = ''; try { o = new URL(ref).origin; } catch (e) { return false; }
  return o === self || list.indexOf(o) >= 0;
}

export default {
  async fetch(request, env) {
    const here = new URL(request.url), self = here.origin;
    if (here.searchParams.has('ping')) return new Response('ok', { headers: { 'access-control-allow-origin': '*', 'cache-control': 'no-store' } });
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
    if (!allowed(request, env, self)) return page(403, 'This proxy is not enabled for this website.', '');
    const target = here.searchParams.get('url');
    let url;
    try { url = new URL(target); if (!/^https?:$/.test(url.protocol)) throw 0; } catch (e) { return page(400, 'That is not a web address.', target); }
    if (!env.ALLOW_PRIVATE && /^(localhost|.*\.local|.*\.internal)$/i.test(url.hostname)) return page(403, 'That address is not allowed.', url.href);
    try {
      let res;
      for (let hop = 0; hop < 6; hop++) {
        res = await fetch(url.href, { redirect: 'manual', headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8', 'accept-language': 'en-US,en;q=0.9' } });
        const loc = res.headers.get('location');
        if (res.status >= 300 && res.status < 400 && loc) { url = new URL(loc, url); if (!/^https?:$/.test(url.protocol)) return page(502, 'Redirected to an unsupported address.', url.href); continue; }
        break;
      }
      if (res.status >= 300 && res.status < 400) return page(502, 'Too many redirects.', target);
      const ct = res.headers.get('content-type') || 'application/octet-stream';
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.length > MAX_BYTES) return page(413, 'That file is too large.', url.href);
      const headers = new Headers({ 'cache-control': 'no-store' });
      if (/^text\/html|application\/xhtml/i.test(ct)) {
        let html = decode(buf, ct).replace(/<meta[^>]+http-equiv=["']?content-security-policy[^>]*>/gi, '').replace(/<base\b[^>]*>/gi, '');
        const inject = `<base href="${esc(url.href)}">` + clientScript(self, url.href);
        html = /<head\b[^>]*>/i.test(html) ? html.replace(/<head\b[^>]*>/i, m => m + inject) : inject + html;
        headers.set('content-type', 'text/html; charset=utf-8');
        return new Response(html, { status: res.status, headers });
      }
      res.headers.forEach((v, k) => { if (!DROP.has(k.toLowerCase()) && k.toLowerCase() !== 'cache-control') headers.set(k, v); });
      return new Response(buf, { status: res.status, headers });
    } catch (e) {
      return page(502, 'The site could not be reached.', target);
    }
  }
};
