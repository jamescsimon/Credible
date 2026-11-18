/* Instructions and Credits windows (opened from the Start menu). */
(function (C) {
  C.info = {
    buildHelp: function (body) {
      body.classList.add('doc');
      body.innerHTML =
        '<h2><img src="images/retrobar/help.png" width="16" height="16" alt=""> How to play Credible</h2>' +
        '<p>A real article is open in the Internet Browser. Decide which <b>information-disorder category</b> best describes it. Some articles fit more than one; any correct category counts.</p>' +
        '<ol><li><b>Investigate</b> in the Internet Browser. Read the article, click links inside it, open the <b>Links from the article</b> list (☰), type a web address, or search the web. <b>History</b> shows where you have been.</li>' +
        '<li><b>Choose</b> a category in the Control Panel and press <b>Submit answer</b>.</li>' +
        '<li><b>Read the feedback.</b> You have ' + C.game.max + ' guesses. Investigating is free; only submitting uses a guess. A ruled-out category is disabled.</li>' +
        '<li><b>Finish</b> by solving it or using every guess. The Task Manager then shows the result, the reasoning, a credibility rating and the sources.</li></ol>' +
        '<p>Time played is shown on the Alarm Clock. It is only a statistic: there is no time penalty and no score.</p>' +
        '<h3>Tips</h3><ul><li>If a page stays blank, that site does not allow embedding. Use the <b>↗</b> button to open it in a new browser tab.</li>' +
        '<li>Closed a window by accident? Reopen it from the Start menu or the desktop icons. Your progress is kept.</li>' +
        '<li>Your progress is saved in this browser. Use <b>Reset demo</b> in the Start menu to start over.</li></ul>';
    },
    buildCredits: function (body) {
      body.classList.add('doc');
      body.innerHTML =
        '<h2>Credits</h2>' +
        '<p class="note"><b>About the articles:</b> the pages shown in the browser are real web pages, displayed from their publishers’ own sites; Credible does not copy or change them. The category, credibility rating and reasoning are the course authors’ own analysis. A page may change or disappear after a question is written.</p>' +
        '<h3>Visual assets</h3><ul>' +
        '<li><b>RetroBar</b> (Apache License 2.0, © Sam Johnson and community contributors): <code>help.png</code>, shown in the Instructions window heading. License text is in <code>licenses/</code>.</li>' +
        '<li>Desktop wallpaper and taskbar / Start button artwork were supplied with the project in <code>images/</code>. Windows XP is a trademark of Microsoft. This is an unofficial educational homage and is not affiliated with Microsoft.</li>' +
        '<li>Application icons, window chrome and the game’s illustrations are drawn with inline SVG and CSS.</li></ul>' +
        '<h3>Music</h3><p>“dream OS” by <b>alyzea</b>, used as background music in the Media Player. Listen to the original: <a href="https://www.youtube.com/watch?v=pr6t6AJ6lho" target="_blank" rel="noopener noreferrer">youtube.com/watch?v=pr6t6AJ6lho</a>. All rights remain with the artist.</p>' +
        '<h3>Categories</h3><p>Answer choices follow the seven types of information disorder from Wardle &amp; Derakhshan, plus “No information disorder identified.”</p>' +
        '<h3>Built for</h3><p>EIS 103 course project, demo version.</p>';
    }
  };
})(window.Credible);
