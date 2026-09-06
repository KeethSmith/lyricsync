# Lyric feedback

The wrong-lyrics button stores the displayed LRCLIB ID under the current Spotify track ID in browser localStorage, selects an alternative, and reports that LRCLIB ID. Reset clears local exclusions for the current song only. It cannot withdraw reports already sent.

LRCLIB flagging requires a fresh proof-of-work challenge and a single-use `X-Publish-Token`; example tokens are not reusable credentials. The worker solves the official SHA-256 challenge without freezing the lyrics view. Only the selected entry ID and the message `The lyrics don't match the audio` are reported. No Spotify tokens or listening history are sent with reports.

## Hosting the report relay

The live LRCLIB CORS response currently omits `X-Publish-Token`, preventing a direct cross-origin flag request from GitHub Pages. The site therefore needs `relay.server.mjs` hosted behind HTTPS, with `REPORT_RELAY_URL` in `config.js` set to that public origin. The website itself stays on GitHub Pages. The relay accepts only the fixed reasons `The lyrics don't match the audio` and `The track is not instrumental`.

Run on Node 22 or later: `node relay.server.mjs`. Configure `PORT` for the hosting service and `HOST=0.0.0.0` for a container host. `SITE_ORIGIN` defaults to `https://keethsmith.github.io`. The relay accepts only the two fixed LRCLIB routes, validates report payloads, limits body size and request rate, and never retries a report automatically. Put it behind the host's HTTPS endpoint; enforce additional deployment-wide rate limits when scaling to multiple instances.

Local test: the relay defaults to `127.0.0.1:8787`. A public HTTPS page may require browser local-network access permission to use a local relay. A hosted HTTPS relay is the portable option.

Until the relay is configured, local version rejection and replacement work, and the UI explicitly reports that the flag was not confirmed. No fake report is submitted during tests.

Rebuild the worker after dependency changes: `npm run build:worker`. Run checks with `npm test`.
