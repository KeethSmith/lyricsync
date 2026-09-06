# LyricSync

A static Spotify lyric visualizer hosted on GitHub Pages. Uses Spotify Authorization Code with PKCE and LRCLIB timed lyrics. No backend or client secret.

## Use

Open https://keethsmith.github.io/spotify-lyric-visualizer/ and choose Explore a demo, or connect your Spotify app.

1. Create an app at https://developer.spotify.com/dashboard with Web API enabled.
2. Register the exact redirect URI `https://keethsmith.github.io/spotify-lyric-visualizer/`.
3. Enter the app's Client ID on the website and connect Spotify.
4. Play a song in Spotify. The page polls every five seconds and updates lyric position locally every 250 ms.

Spotify developer account requirements and app user restrictions apply. If access is denied, check the app's allowed users and current Spotify development-mode requirements. Lyrics availability varies; plain lyrics and instrumental tracks are handled separately. The demo uses original sample text and does not play audio.

Client ID is saved locally; access and refresh tokens are stored only in tab-scoped session storage. Disconnect clears the session. No credentials are committed to this repository. Track metadata is sent to LRCLIB to look up lyrics.

## Development

Serve this directory over HTTP, for example `python -m http.server 8080 --bind 127.0.0.1`, and register `http://127.0.0.1:8080/` as another Spotify redirect URI. Run `node --test lyrics.test.mjs` for timing tests. GitHub Pages serves the root of `main` automatically after a push.
