# Credible

A daily information-literacy game presented as a retro Windows XP desktop. A real article opens in a simulated browser; investigate it (and the links it leads to), then guess which information-disorder category describes it. (Version 1: classification only.)

## Run it
Start everything with one command (Node 18+, no installs):

```
node proxy/server.js
```
then open **http://localhost:8000**. This serves the app (port 8000) and the page proxy (port 8787). The app also works with any static server (`python -m http.server 8000`), but then real articles load without the proxy (see below). Open `index.html?date=2026-11-18` to load a specific day.

## Why a proxy
Most news sites refuse to appear inside an iframe (`X-Frame-Options` / `frame-ancestors`), and nothing in the iframe tag can override that. `proxy/server.js` fetches the page for the player, drops those headers, and rewrites links so each click stays inside the game. The proxied page also reports its real address back, so **every page the player reaches by clicking inside an article is recorded in History** and shown in the results.

- If the proxy is not running, the browser falls back to plain iframes: sites that allow embedding work, others stay blank (use the **↗** button to open them in a real tab). Links clicked inside those pages cannot be recorded.
- Some sites put a bot check ("Just a moment…") in front of automated fetches. The proxy does not try to defeat those; it shows a message and the player can use **↗**. In a test, 5 of the 8 sites in the example sheet loaded (BuzzFeed, Breitbart, ScienceAlert, Climate.gov, VT Foreign Policy's other pages); vtforeignpolicy.com's article, Politico and AP showed the bot check. Pick sources that load, or accept ↗ for them.
- The proxy refuses private-network addresses, only handles http(s), limits size and time, and never forwards cookies. It is still an open fetcher: **do not expose it publicly without access control**. The proxy must be on a different origin from the app (different port or host).
- **GitHub Pages / any static host cannot run a proxy**, so a hosted copy needs one elsewhere. `proxy/worker.js` is the same proxy as a free Cloudflare Worker:
  1. dash.cloudflare.com > Workers & Pages > Create > Create Worker > Deploy, then *Edit code*, paste `proxy/worker.js`, Deploy.
  2. Worker > Settings > Variables: add `ALLOWED_ORIGINS` = `https://YOURNAME.github.io` (your Pages site; comma-separate more). Without it anyone can use your Worker as a free proxy.
  3. Put the Worker address in `proxyUrl` in `data/config.js` (e.g. `https://credible.YOURNAME.workers.dev`), commit and push.

  On localhost the game uses `localProxyUrl` (`node proxy/server.js`); anywhere else it uses `proxyUrl`. With neither reachable it loads pages directly and blocked sites stay blank (that is what a Pages copy shows until the Worker is set up).

## How it plays
1. **Internet Browser**: the article is open. Read it, click links inside it, open **☰** for the *Links from the article* list and *History*, type a web address, or type words to search the web (the search opens in a real tab and the query is logged).
2. **Control Panel**: pick one of 8 categories and press **Submit answer**. Three guesses (investigating is free). Rejected categories are disabled; duplicates are blocked.
3. A question can have **more than one correct category**; guessing any of them solves it. The results list them all.
4. **Task Manager** opens when the puzzle ends: outcome, guesses, time, correct categories, credibility rating (1-5), reasoning, the sources (you can reopen them), and a spoiler-free copyable share result. If the sheet is connected it also shows how everyone else did.
5. **Alarm Clock** shows time played (a statistic only, no penalty), **Media Player** has the music and mute/volume, the **Start menu** reopens windows, shows Instructions/Credits, and resets the demo.

Windows can be dragged (they stay on-screen), minimized, closed and reopened. Progress, timer, browser history, window layout and sound settings persist in `localStorage`, per day.

## Writing questions (one table, one row per question)
One sheet tab named `questions` (the example is `data/questions.csv`). Columns are found by their header text:

| Column | What to write |
|---|---|
| `Original Source` | the article's web address |
| `Information Distorders?` | one or more category names, separated by commas: Satire, False connection, Misleading content, False context, Imposter content, Manipulated content, Fabricated content, None. Any listed one counts as correct. |
| `Reasoning` (first) | why that classification is right (shown after the game) |
| `Credibility (1-5)` | a number |
| `Reasoning` (second) | why that credibility rating (shown after the game) |
| `Supporting Clue` (as many columns as you like) | web addresses of pages that help (shown in the *Links from the article* list) |
| `Date` (optional) | `YYYY-MM-DD`. Without it, questions run one per day in row order starting on `startDate` (in `data/config.js`), then repeat. |
| `players_completed, players_solved, avg_guesses, avg_time_sec` | filled in by the script; don't edit |

Only `http(s)` addresses are used. Unknown category names stop the game with a message listing the valid ones.

### Connecting the Google Sheet
1. Make a sheet with one tab named `questions` and import `data/questions.csv`.
2. Extensions > Apps Script, paste `sheets/Code.gs`, Deploy > New deployment > Web app (execute as you, access: Anyone). Put the `/exec` URL in `sheetUrl` in `data/config.js`.

That one URL serves today's question (only that day's row is ever sent, so other answers aren't exposed) and receives each finished game. The script adds 1 to `players_completed` and moves the averages with `new_avg = (old_avg × n + x) / (n + 1)`, so no per-player data is stored. The browser reports once per puzzle per browser.

## Layout
```
index.html  css/  js/ (loader, csv, state, stats, wm, sound, icons, main, apps/*)
data/ (config, categories, questions.csv)  proxy/ (server.js local, worker.js Cloudflare)  sheets/Code.gs  images/  licenses/
```

## Assets and licenses
- Music: "dream OS" by alyzea, https://www.youtube.com/watch?v=pr6t6AJ6lho (rights remain with the artist).
- `images/retrobar/help.png` is copied from RetroBar (Apache-2.0). License texts are in `licenses/`.
- `images/*` (wallpaper, taskbar, Start button) were already provided in this project.
- Application icons, window chrome and category icons (emoji) are drawn with SVG/CSS/Unicode.
- Windows XP is a trademark of Microsoft; this is an unofficial educational homage.
- The articles are real third-party pages shown from their publishers' sites; Credible stores only their web addresses. The classifications and ratings are the course authors' own analysis.

## Tests run
Headless Chrome (puppeteer-core) with real sites stubbed: question selection (rotation, wrap-around, multiple answers, blank clue cells), iframe attributes and sandbox, clue links, typed addresses, free-text search logging, `javascript:` rejection, back/forward/home, guesses and persistence, multi-category solve, results, sources, failed path, reset, stats reporting (once) and display, and a readable error for bad data. A second suite starts the proxy against a local page that sends `X-Frame-Options: DENY`: it renders, in-article link clicks and redirects are recorded in History with page titles, back works, fragment links stay put, the proxy-down fallback works, and private/non-http targets are refused. The proxy was also run against the real sites listed above.

## Known limitations
- Sites with bot protection (see above) and heavily script-driven pages may not display correctly through the proxy; navigation done by a page's own JavaScript (not link clicks) isn't tracked.
- Real articles change or disappear after a question is written; the sheet only stores addresses.
- Statistics are unauthenticated (anyone can POST to the web app URL), so treat them as a casual indicator.
- Reading from the sheet and the stats web app is untested against a real Google deployment (only a local stand-in).
- There is no hint per wrong category any more (the sheet format has no such column); wrong guesses get one generic message.
- Background music (`images/alyzea - dream OS.mp3`, 17 MB) starts on the first click because browsers block autoplay. Confirm the track's license before sharing publicly.
- Windows cannot be resized or maximized. Layout is built for desktop-size screens.
- Progress lives in this browser's `localStorage` only; clearing site data resets it.
