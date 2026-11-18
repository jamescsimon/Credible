# Credible

A daily information-literacy game presented as a retro Windows XP desktop. Read a social media post, investigate it in a simulated browser, and guess the information-disorder category that best describes it. (Version 1: classification only.)

**All content is fictional.** Every person, place, outlet, page and image is invented. The "photograph" is an SVG drawn in code.

## Run it
The question of the day is data, loaded at start-up, so the page needs `http(s)` (browsers block reading local files from `file://`):

```
python -m http.server 8000     # then open http://localhost:8000
```
Open `index.html?date=2026-11-17` to load a specific day. The app does not read from the `RetroBar` folder.

## How it plays
1. **Internet Browser**: read the post, open the author's profile, read replies, follow links, open image details, and use a new tab (`+`) for search. Back / Forward / Home and the address bar work. Typing a known address opens it; other text is searched. Nothing leaves the simulation.
2. **Control Panel**: pick one of 8 categories and press **Submit answer**. Three guesses (investigating is free). Rejected categories are disabled; duplicates are blocked. Wrong guesses give a short puzzle-specific hint.
3. **Task Manager** opens when the puzzle ends: outcome, guesses, time, correct category, explanation, decisive sources (click to open them in the browser), a reusable verification tactic and a spoiler-free copyable share result.
4. **Alarm Clock** shows elapsed play time (a statistic only: no penalty or score). **Media Player** has mute/volume for the synthesized UI sounds.
5. **Start menu**: reopen any window, read Instructions and Credits, or **Reset demo**.

Windows can be focused, dragged (they stay on-screen), minimized, closed and reopened. Progress, timer, browser history, window layout and sound settings persist in `localStorage`, scoped to the puzzle id and date.

## Writing a question (plain text, one table)
The whole question is **one sheet, one tab named `question`** (a CSV copy of the example day is `data/question.csv`). Each row is one thing, and every row starts with its **date** (`YYYY-MM-DD`, column formatted as Plain text) and a **part** that says what the row is. Adding tomorrow's question = adding rows dated tomorrow.

| part | what to fill in |
|---|---|
| `answer` | `name`: the correct category, e.g. False context |
| `post` | `name`: author's handle · `text`: the post · `detail`: time shown · `image`: picture name (optional) |
| `explanation` | `text`: why that category is right |
| `tactic` | `text`: the reusable verification tip |
| `person` | `name`: handle · `title`: display name · `text`: bio |
| `reply` | `name`: handle · `text` · `detail`: time (appears under the post) |
| `earlier post` | `name`: handle · `text` · `detail`: when (appears on that person's profile) |
| `page` / `news page` / `government page` / `weather page` | `title` · `site` · `text` · `detail`: byline · `link`: address (optional) · `image`: picture name (optional) · `keywords`: words that find it in search. The part picks the look. |
| `key evidence` | `title`: the exact title of a page above · `text`: why it matters (shown on the results screen) |
| `image` | `name` · `text`: description · `detail`: caption · `title`: street sign text · `site`: shop sign text · `link`: a real picture URL (optional, replaces the illustration) |
| `hint` | `name`: a wrong category · `text`: the hint after that wrong guess (one row per category except the answer) |

Columns: `date, part, name, title, text, detail, site, link, image, keywords`, then `players_completed, players_solved, avg_guesses, avg_time_sec`. The last four are filled in by the script on the `answer` row. Don't edit them.

- **Text**: a blank line starts a new paragraph. Two or more lines written as `Label: value` show as a table. Web addresses like `courier.calderbay.example/news/...` become links automatically, in pages and replies.
- **Search** is automatic: a page is found by words in its `title`, `site` and `keywords`.
- **Picture** names must match an `image` row; leave `link` blank to get the built-in illustration (the sign text is what players can search for).
- Categories are written by name (False context, Satire, …); a wrong spelling shows a plain-English error listing the choices. A dropdown on the `part` column and a category dropdown help authors.

### Connecting the Google Sheet
1. Make a sheet with one tab named `question` and import `data/question.csv`.
2. Extensions > Apps Script, paste `sheets/Code.gs`, Deploy > New deployment > Web app (execute as you, access: Anyone). Put the `/exec` URL in `sheetUrl` in `data/config.js`.

That one URL does both jobs. The page asks it for today's rows (it only ever sends that day, so tomorrow's answers aren't exposed) and sends each finished game back. For each finished game the script adds 1 to `players_completed` and moves the averages with `new_avg = (old_avg × n + x) / (n + 1)`, so no per-player data is stored. The browser reports once per puzzle per browser. Task Manager shows the result as "Everyone else so far" the next time the page loads.

`data/categories.js` holds the eight categories; `maxGuesses` is in `data/config.js`.

Search is simple keyword matching: each entry lists `keywords`; query words are matched (ignoring common stop words) against them and the page title.

## Layout
```
index.html  css/  js/ (loader, csv, scene, state, stats, wm, sound, icons, main, apps/*)  data/ (config, categories, example day as one CSV)  sheets/Code.gs  images/  licenses/
```

## Assets and licenses
- Music: "dream OS" by alyzea, https://www.youtube.com/watch?v=pr6t6AJ6lho (rights remain with the artist).
- `images/retrobar/help.png` is copied from RetroBar (Apache-2.0). License texts are in `licenses/`.
- `images/*` (wallpaper, taskbar, Start button) were already provided in this project.
- Application icons, window chrome and category icons (emoji) are drawn with SVG/CSS/Unicode.
- Windows XP is a trademark of Microsoft; this is an unofficial educational homage.

## Tests run
An end-to-end browser script (headless Chrome via puppeteer-core) verified: window close/minimize/reopen and Start menu, drag clamping, browser back/forward/tabs/links/typed URLs, six search queries plus the empty state, wrong and correct guesses, disabled categories, refresh persistence, the results window and share text, the exhausted-guesses path, reset, and small-viewport re-clamping, with no console errors.

## Known limitations
- Statistics are unauthenticated (anyone can POST to the web app URL), so treat them as a casual indicator. The script validates ranges but cannot verify a game was honest.
- Reading from the sheet and the stats web app is untested against a real Google deployment (only a local stand-in).
- Plain-text pages have no bold/italics and at most one picture. Profiles show a bio only (no follower counts).
- RetroBar has no application icons, so icons are drawn; category icons use emoji, which vary by OS.
- Background music (`images/alyzea - dream OS.mp3`, 17 MB) starts on the first click because browsers block autoplay; feedback sounds are synthesized. Confirm the track's license before sharing publicly.
- Windows cannot be resized or maximized. Layout is built for desktop-size screens.
- Progress lives in this browser's `localStorage` only; clearing site data resets it.
- Search is keyword-only and covers just the day's authored pages.
