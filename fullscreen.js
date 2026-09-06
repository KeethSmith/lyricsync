const panel = document.getElementById('lyricsPanel');
const button = document.getElementById('fullscreenLyrics');
const lyrics = document.getElementById('lyrics');
let expanded = false;

function update() {
  expanded = document.fullscreenElement === panel || panel.classList.contains('lyrics-expanded');
  button.textContent = expanded ? 'Exit fullscreen' : 'Fullscreen';
  button.setAttribute('aria-pressed', String(expanded));
  button.setAttribute('aria-label', expanded ? 'Exit lyrics fullscreen' : 'Show lyrics fullscreen');
  // Recenter after changing the available lyric area, including paused playback.
  requestAnimationFrame(() => {
    const active = lyrics.querySelector('.active');
    if (active && document.getElementById('follow').checked) {
      lyrics.scrollTop = active.offsetTop - lyrics.clientHeight / 2 + active.clientHeight / 2;
    }
  });
}

function exitFallback() {
  panel.classList.remove('lyrics-expanded');
  document.body.classList.remove('lyrics-fullscreen-open');
  update();
  button.focus();
}

button.addEventListener('click', async () => {
  if (document.fullscreenElement === panel) {
    try { await document.exitFullscreen(); } catch { /* Browser retains its own exit controls. */ }
    return;
  }
  if (expanded) { exitFallback(); return; }
  panel.classList.add('lyrics-expanded');
  document.body.classList.add('lyrics-fullscreen-open');
  update();
  button.focus();
  if (panel.requestFullscreen && document.fullscreenEnabled) {
    try { await panel.requestFullscreen(); return; } catch { /* Use an in-page view if unavailable. */ }
  }
});
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) exitFallback();
  else { update(); button.focus(); }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && panel.classList.contains('lyrics-expanded')) exitFallback();
});
