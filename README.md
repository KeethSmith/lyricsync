# LyricSync

A static Spotify lyric visualizer hosted on GitHub Pages. Uses Spotify Authorization Code with PKCE and LRCLIB timed lyrics. No backend or client secret.

## Use

Open https://keethsmith.github.io/spotify-lyric-visualizer/ and choose Explore a demo, or connect your Spotify app.

1. Create an app at https://developer.spotify.com/dashboard with Web API enabled.
2. Register the exact redirect URI `https://keethsmith.github.io/spotify-lyric-visualizer/`.
3. Set `SPOTIFY_CLIENT_ID` in `config.js` to your public Client ID and push to deploy. Visitors can then click **Sign in with Spotify**, complete sign-in at `https://accounts.spotify.com/authorize`, and return to the site. Never put a client secret in this file. For personal use, a Client ID can also be entered under App configuration on the site.
4. Play a song in Spotify. The page polls every five seconds and updates lyric position locally every 250 ms.

Spotify developer account requirements and app user restrictions apply. If access is denied, check the app's allowed users and current Spotify development-mode requirements. Lyrics availability varies; plain lyrics and instrumental tracks are handled separately. The demo uses original sample text and does not play audio.

Client ID is saved locally; access and refresh tokens are stored only in tab-scoped session storage. Disconnect clears the session. No credentials are committed to this repository. Track metadata is sent to LRCLIB to look up lyrics.

## Development

Serve this directory over HTTP, for example `python -m http.server 8080 --bind 127.0.0.1`, and register `http://127.0.0.1:8080/` as another Spotify redirect URI. Run `node --test lyrics.test.mjs` for timing tests. GitHub Pages serves the root of `main` automatically after a push.

## Playback and appearance
Previous, play/pause, next, and seeking are available in normal and lyrics fullscreen views. Playback controls require Spotify Premium, an active Spotify device, and the user-modify-playback-state permission. Existing users must sign in again to grant this permission. Failed commands are never automatically replayed. Demo mode supports pause and seeking without changing real playback.

Dark mode is the default. The theme toggle is available in both views and remembers the selected appearance in this browser.

