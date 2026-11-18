/* Instructions and Credits windows (opened from the Start menu). */
(function (C) {
  C.info = {
    buildHelp: function (body) {
      body.classList.add('doc');
      body.innerHTML =
        '<h2><img src="images/retrobar/help.png" width="16" height="16" alt=""> How to play Credible</h2>' +
        '<p>A social media post has appeared. Decide which <b>information-disorder category</b> best describes it.</p>' +
        '<ol><li><b>Investigate</b> in the Internet Browser: read the post, open the author’s profile, check the replies, follow links, and use the search tab.</li>' +
        '<li><b>Choose</b> a category in the Control Panel and press <b>Submit answer</b>.</li>' +
        '<li><b>Read the feedback.</b> You have ' + C.game.max + ' guesses. Investigating is free; only submitting uses a guess. A ruled-out category is disabled.</li>' +
        '<li><b>Finish</b> by solving it or using every guess. The Task Manager then shows the result, explanation and sources.</li></ol>' +
        '<p>Time played is shown on the Alarm Clock. It is only a statistic: there is no time penalty and no score.</p>' +
        '<h3>Tips</h3><ul><li>Closed a window by accident? Reopen it from the Start menu or the desktop icons. Your progress is kept.</li>' +
        '<li>Your progress is saved in this browser. Use <b>Reset demo</b> in the Start menu to start over.</li></ul>' +
        '<p class="note"><b>Everything here is fictional.</b> The post, people, places, news outlets and events are invented for this demo.</p>';
    },
    buildCredits: function (body) {
      body.classList.add('doc');
      body.innerHTML =
        '<h2>Credits</h2>' +
        '<p class="note"><b>Fictional content notice:</b> Chirper, Dana Reyes, Harlow City, Calder Bay, the Calder Bay Courier, Imre Voss, Storm Odessa and every other person, outlet, page and image in this game are invented. The “photograph” is an illustration drawn in code. Any resemblance to real events is coincidental.</p>' +
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
