# ISI integration — deployment notes

The Initiative Stability Index is integrated into this Sayudi build at `/isi/`.

## Changes in this revision
- Homepage hero is a minimal ISI entry point and no longer uses canvas.
- The hero renders fully without JavaScript; JS only cycles the subtle six-point highlight.
- `/isi/` now uses the same Sayudi navigation, logo system, global stylesheet, interaction layer and footer as the rest of the website.
- ISI V2.0 reduces the assessment from 30 questions to six: one carefully selected diagnostic question per vector, all on one screen.
- Per-vector evidence questions and step-by-step vector navigation have been removed.
- Unknown remains available and contributes to Visibility without being treated as a neutral score.

## Privacy behavior
Initiative names, answers, local snapshots and printable reports remain client-side. Anonymous aggregate telemetry is sent only for fully scored six-vector assessments.

## Telemetry route requirement
The static frontend expects:
- `POST /api/isi/telemetry`
- `GET /api/isi/stats?version=2.0.0`

The assessment remains functional if these routes are unavailable. Aggregate comparison simply stays hidden.
