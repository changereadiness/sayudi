# ISI integration — deployment notes

The Initiative Stability Index is integrated into this Sayudi build at `/isi/`.

## Site integration
- Homepage hero is fully dedicated to ISI.
- `ISI` is present in the primary navigation.
- `Initiative Stability Index` is present in the Explore footer.
- The Exposure page includes a contextual bridge into ISI.
- Homepage deep links support `/isi/?view=setup` and `/isi/?view=method`.

## Privacy behavior
The assessment, scoring engine, saved snapshots, perspective labels, initiative names and printable report remain client-side. The frontend sends only the aggregate-safe completion payload defined by the ISI privacy specification.

## Telemetry route requirement
The static frontend expects:
- `POST /api/isi/telemetry`
- `GET /api/isi/stats?version=1.0.0`

The assessment remains fully functional if these requests fail. Aggregate counts and comparison data simply remain unavailable until the Worker routes are deployed.

Use the separate ISI telemetry Worker package to provide these endpoints. Keep Worker persistent observability disabled as specified in its `wrangler.jsonc`.

## Files added
- `/isi/index.html`
- `/isi/isi.css`
- `/isi/engine.js`
- `/isi/app.js`
- `/isi/stats.html`
- `/isi/stats.js`

## Files modified
- `/index.html`
- `/assets/css/style.css`
- `/assets/css/interactions.css`
- `/assets/js/site.js`
- standardized navigation/footer markup across `/pages/*.html`
- `/pages/exposure.html` additionally receives the ISI bridge
