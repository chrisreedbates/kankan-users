// Hero video: starts playback (only when the visitor has not asked for reduced
// motion) and provides the pause/play control (WCAG 2.2.2). The <video> has no
// autoplay attribute, so nothing moves before this script decides. Without JS,
// CSS hides the video and the still poster (the icon card) shows.
// No network calls of its own, no storage.
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  function init() {
    var btn = document.getElementById('vbtn');
    var videos = Array.prototype.slice.call(document.querySelectorAll('.screen video'));
    if (!btn || !videos.length) return;
    var label = btn.querySelector('.vbtn-label');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var wantPlay = !reduce.matches;

    function visible(v) { return window.getComputedStyle(v).display !== 'none'; }

    function sync() {
      videos.forEach(function (v) {
        if (wantPlay && visible(v)) {
          var p = v.play();
          if (p && p.catch) p.catch(function () { wantPlay = false; render(); });
        } else {
          v.pause();
        }
      });
      render();
    }

    function render() {
      btn.classList.toggle('is-paused', !wantPlay);
      label.textContent = wantPlay ? 'Pause video' : 'Play video';
    }

    // Keep the <picture> poster visible until a clip has really started, so a
    // video that never plays (reduced motion) never shows as an empty box.
    videos.forEach(function (v) {
      v.addEventListener('playing', function () { v.classList.add('is-live'); });
      v.addEventListener('emptied', function () { v.classList.remove('is-live'); });
    });

    btn.addEventListener('click', function () { wantPlay = !wantPlay; sync(); });
    var scheme = window.matchMedia('(prefers-color-scheme: dark)');
    // <source media> is only evaluated on load, so reload to pick the other scheme's clip.
    if (scheme.addEventListener) scheme.addEventListener('change', function () {
      videos.forEach(function (v) { v.load(); });
      sync();
    });
    if (reduce.addEventListener) reduce.addEventListener('change', function () { wantPlay = !reduce.matches; sync(); });

    btn.hidden = false;
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
