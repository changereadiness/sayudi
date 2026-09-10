import {
  ISI_VERSION,
  RESPONSE_SCALE,
  PERSPECTIVE_OPTIONS,
  VECTORS,
  calculateAssessment,
  calculateVolatility,
  comparePerspectives,
  diagnose,
  buildObservations,
  questionsWorthExamining,
  sanitizeTelemetry
} from "./engine.js";

const STORAGE_KEY = "sayudi_isi_local_v2";
const TELEMETRY_URL = "/api/isi/telemetry";
const STATS_URL = `/api/isi/stats?version=${encodeURIComponent(ISI_VERSION)}`;
const MIN_COMPARISON_SAMPLE = 100;

const app = document.querySelector("#app");
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
}[character]));

const state = {
  view: "intro",
  initiativeName: "",
  perspective: "Executive / Sponsor",
  answers: Object.fromEntries(VECTORS.map(v => [v.id, null])),
  result: null,
  savedRun: null,
  telemetrySent: false,
  stats: null,
  groupId: null,
  _returnView: "intro"
};

function localData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { runs: [] };
  } catch {
    return { runs: [] };
  }
}

function saveLocalData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function selectedPerspectiveLabel() {
  return state.perspective || "Executive / Sponsor";
}

function resetAssessment({ keepSetup = false } = {}) {
  const name = keepSetup ? state.initiativeName : "";
  const perspective = keepSetup ? state.perspective : "Executive / Sponsor";
  state.initiativeName = name;
  state.perspective = perspective;
  state.answers = Object.fromEntries(VECTORS.map(v => [v.id, null]));
  state.result = null;
  state.savedRun = null;
  state.telemetrySent = false;
}

function setView(view) {
  state.view = view;
  const url = new URL(window.location.href);
  if (view === "intro") url.searchParams.delete("view");
  else url.searchParams.set("view", view);
  history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  render();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function renderIntro() {
  app.innerHTML = `
    <section class="isi-page isi-intro-page">
      <div class="container">
        <div class="isi-intro-copy">
          <span class="eyebrow">SAYUDI OPEN TOOL</span>
          <h1>Initiatives rarely fail all at once. They become unstable first.</h1>
          <p class="isi-lead">Six questions examine the structural conditions beneath an active initiative. The result is a directional reading—not a prediction, audit or certification.</p>
          <div class="isi-actions no-print">
            <button class="button" type="button" data-action="assessment">Run the Index</button>
            <button class="isi-text-action" type="button" data-action="method">How it works →</button>
          </div>
          <p class="isi-privacy-line"><strong>Free means free.</strong> No account. No email. No AI. Your assessment belongs to you.</p>
        </div>
      </div>
    </section>`;
}

function renderAssessment() {
  const perspectiveOptions = PERSPECTIVE_OPTIONS.map(option =>
    `<option value="${esc(option)}" ${state.perspective === option ? "selected" : ""}>${esc(option)}</option>`
  ).join("");

  const questionCards = VECTORS.map((vector, index) => {
    const selected = state.answers[vector.id];
    const buttons = RESPONSE_SCALE.map(option => {
      const value = option.value;
      const isUnknown = value === "unknown";
      const active = selected === value;
      return `
        <button
          class="isi-score ${active ? "is-selected" : ""} ${isUnknown ? "is-unknown" : ""}"
          type="button"
          data-vector="${vector.id}"
          data-score="${value}"
          aria-pressed="${active}"
          aria-label="${esc(vector.short)}: ${esc(option.label)}"
        >${isUnknown ? "?" : value}</button>`;
    }).join("");

    return `
      <section class="isi-question-card" role="group" aria-labelledby="isi-vector-${vector.id}">
        <div class="isi-vector-title">
          <span>0${index + 1}</span>
          <h2 id="isi-vector-${vector.id}">${esc(vector.name)}</h2>
        </div>
        <p>${esc(vector.question)}</p>
        <div class="isi-score-row">${buttons}</div>
        <div class="isi-scale-note"><span>1 · Unstable</span><span>5 · Stable</span><span>? · Unknown</span></div>
      </section>`;
  }).join("");

  app.innerHTML = `
    <section class="isi-page isi-assessment-page">
      <div class="container">
        <div class="isi-assessment-head">
          <span class="eyebrow">INITIATIVE STABILITY INDEX</span>
          <h1>Six questions. Answer from what you know today.</h1>
          <p class="isi-lead">Choose the response that best describes the current condition. Use Unknown when you genuinely cannot see enough to judge.</p>
        </div>

        <div class="isi-context-row no-print">
          <label>
            <span>Initiative name <small>optional · stays on this device</small></span>
            <input id="initiativeName" type="text" maxlength="120" autocomplete="off" value="${esc(state.initiativeName)}" placeholder="e.g. ERP rollout">
          </label>
          <label>
            <span>Your vantage point</span>
            <select id="perspective">${perspectiveOptions}</select>
          </label>
        </div>

        <div class="isi-question-list">${questionCards}</div>

        <div id="assessmentWarning" class="isi-warning hidden" role="alert"></div>
        <div class="isi-actions isi-assessment-actions no-print">
          <button class="button" type="button" data-action="calculate">Calculate ISI</button>
          <button class="isi-text-action" type="button" data-action="intro">Cancel</button>
        </div>
      </div>
    </section>`;
}

function findPriorRuns() {
  if (!state.initiativeName.trim()) return { previous: null, previousPrevious: null, perspectives: [] };
  const data = localData();
  const initiative = state.initiativeName.trim().toLowerCase();
  const perspective = selectedPerspectiveLabel().toLowerCase();
  const samePerspective = data.runs
    .filter(run => run.id !== state.savedRun?.id && run.initiativeName?.toLowerCase() === initiative && run.perspective?.toLowerCase() === perspective && run.result?.complete)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const groupId = state.groupId || state.savedRun?.groupId;
  const sameGroup = groupId ? data.runs.filter(run => run.groupId === groupId && run.result?.complete) : [];
  return {
    previous: samePerspective[0]?.result || null,
    previousPrevious: samePerspective[1]?.result || null,
    perspectives: sameGroup.map(run => run.result)
  };
}

function barWidth(score) {
  return score == null ? 0 : ((score - 1) / 4) * 100;
}

function renderResults() {
  const prior = findPriorRuns();
  const volatility = calculateVolatility(state.result, prior.previous, prior.previousPrevious);
  const groupId = state.groupId || state.savedRun?.groupId;
  const savedPerspectiveResults = groupId
    ? localData().runs.filter(run => run.groupId === groupId && run.result?.complete).map(run => run.result)
    : [];
  const perspectiveResults = state.savedRun ? savedPerspectiveResults : [...savedPerspectiveResults, state.result];
  const perspective = comparePerspectives(perspectiveResults);
  const patterns = diagnose(state.result, volatility, perspective).slice(0, 2);
  const observations = buildObservations(state.result, volatility, patterns, perspective);
  const questions = questionsWorthExamining(state.result, patterns);

  const vectorRows = state.result.vectors.map(vector => {
    const delta = volatility.available ? volatility.deltas.find(item => item.id === vector.id)?.delta : null;
    const deltaText = delta == null || delta === 0 ? "" : `<span class="isi-delta ${delta < 0 ? "down" : "up"}">${delta > 0 ? "+" : ""}${delta.toFixed(0)}</span>`;
    const value = vector.score == null ? "Unknown" : vector.score.toFixed(0);
    const status = vector.score == null ? "Insufficient visibility" : vector.status.label;
    return `
      <div class="isi-vector-result ${vector.score == null ? "is-unknown" : ""}">
        <div class="isi-vector-head"><strong>${esc(vector.short)}</strong><span>${value} ${deltaText}</span></div>
        <div class="isi-result-bar"><i style="width:${barWidth(vector.score)}%"></i></div>
        <small>${status}</small>
      </div>`;
  }).join("");

  const patternCards = patterns.length
    ? patterns.map(pattern => `<article class="isi-pattern"><h3>${esc(pattern.title)}</h3><p>${esc(pattern.interpretation)}</p></article>`).join("")
    : `<article class="isi-pattern"><h3>No dominant pattern</h3><p>No single structural relationship crosses a diagnostic threshold. Read the six-vector profile rather than the composite alone.</p></article>`;

  const resultStatus = state.result.provisional ? `${state.result.status.label} · Provisional` : state.result.status.label;
  const visibilityPercent = Math.round((state.result.visibilityScore || 0) * 100);

  app.innerHTML = `
    <section class="isi-page isi-results-page">
      <div class="container">
        <div class="isi-result-hero">
          <div>
            <span class="eyebrow">INITIATIVE STABILITY INDEX</span>
            <h1>${state.result.overallScore.toFixed(2)}<span>/5</span></h1>
            <div class="isi-status">${esc(resultStatus)}</div>
            ${state.initiativeName ? `<p class="isi-result-context">${esc(state.initiativeName)} · ${esc(selectedPerspectiveLabel())}</p>` : ""}
          </div>
          <div class="isi-result-summary">
            <div><span>Visibility</span><strong>${visibilityPercent}%</strong></div>
            <div><span>Strongest</span><strong>${esc(state.result.strongest?.short || "—")}</strong></div>
            <div><span>Weakest</span><strong>${esc(state.result.weakest?.short || "—")}</strong></div>
          </div>
        </div>

        <div class="isi-results-grid">
          <section>
            <span class="eyebrow">SIX-VECTOR PROFILE</span>
            <div class="isi-vector-results">${vectorRows}</div>
          </section>
          <aside class="isi-observations">
            <span class="eyebrow">WHAT STANDS OUT</span>
            ${observations.map(item => `<p>${esc(item)}</p>`).join("")}
          </aside>
        </div>

        <section class="isi-pattern-section">
          <span class="eyebrow">DIAGNOSTIC SIGNAL</span>
          <div class="isi-pattern-grid">${patternCards}</div>
        </section>

        <section class="isi-questions-section">
          <span class="eyebrow">QUESTIONS WORTH EXAMINING</span>
          ${questions.map((question, index) => `<div class="isi-exam-question"><span>0${index + 1}</span><p>${esc(question)}</p></div>`).join("")}
        </section>

        ${renderAggregateComparison()}

        <section class="isi-local-section no-print">
          <div>
            <span class="eyebrow">LOCAL CONTINUITY</span>
            <h2>Keep the assessment yours.</h2>
            <p>Snapshots, initiative names and reports stay in this browser.</p>
          </div>
          <div class="isi-local-actions">
            <button class="button button-light" type="button" data-action="snapshot">${state.savedRun ? "Snapshot saved locally" : "Save snapshot locally"}</button>
            <button class="isi-outline-button" type="button" data-action="add-perspective">Add another perspective</button>
            <button class="isi-outline-button" type="button" data-action="print">Save / print PDF</button>
            <button class="isi-danger-action" type="button" data-action="clear-local">Delete local ISI data</button>
          </div>
        </section>

        <p class="isi-results-privacy"><strong>Private by design.</strong> Individual answers, initiative names, snapshots and reports remain on this device. <button type="button" data-action="privacy">See exactly what is collected.</button></p>
      </div>
    </section>`;

  if (!state.telemetrySent) sendCompletionTelemetry({ volatility, perspectiveCount: perspectiveResults.length });
  fetchStats();
}

function renderAggregateComparison() {
  if (!state.stats || Number(state.stats.completed || 0) < MIN_COMPARISON_SAMPLE) return '<div id="aggregateComparison"></div>';
  const avgOverall = Number(state.stats.averages?.overall || 0);
  const diff = state.result.overallScore - avgOverall;
  return `
    <section id="aggregateComparison" class="isi-aggregate-section">
      <span class="eyebrow">COMPLETED ISI ASSESSMENTS</span>
      <h2>${Number(state.stats.completed).toLocaleString()} assessments. Average ISI ${avgOverall.toFixed(2)}.</h2>
      <p>Your current result is ${Math.abs(diff).toFixed(2)} points ${diff >= 0 ? "above" : "below"} the aggregate average of completed assessments. This is a descriptive comparison, not an industry benchmark.</p>
    </section>`;
}

function renderPrivacy() {
  app.innerHTML = `
    <section class="isi-page isi-info-page">
      <div class="container">
        <span class="eyebrow">PRIVACY BY DESIGN</span>
        <h1>Free means free. Your assessment belongs to you.</h1>
        <p class="isi-lead">The assessment is designed so useful initiative data remains on your device while Sayudi retains only anonymous aggregate statistics from fully scored assessments.</p>
        <div class="isi-info-grid">
          <article><h2>Never sent to Sayudi</h2><p>Initiative name, individual answers, perspective label, local snapshots, diagnostic report content or PDFs.</p></article>
          <article><h2>Aggregate telemetry</h2><p>Instrument version, overall score, six vector scores, stability classification and non-identifying aggregate fields.</p></article>
          <article><h2>No identity layer</h2><p>No account, email, CRM handoff, user profile, cookie ID or device ID is required by ISI.</p></article>
        </div>
        <div class="isi-actions no-print"><button class="button" type="button" data-action="return">Return</button></div>
      </div>
    </section>`;
}

function renderMethod() {
  app.innerHTML = `
    <section class="isi-page isi-info-page">
      <div class="container">
        <span class="eyebrow">METHOD</span>
        <h1>Six vectors. One judgment each.</h1>
        <p class="isi-lead">Each vector asks one broad diagnostic question scored from 1 to 5. The six scores carry equal weight. Unknown is excluded from the composite and lowers Visibility.</p>
        <div class="isi-method-list">
          ${VECTORS.map((vector, index) => `
            <article>
              <span>0${index + 1}</span>
              <div><h2>${esc(vector.name)}</h2><p>${esc(vector.definition)}</p></div>
            </article>`).join("")}
        </div>
        <div class="isi-method-note"><strong>Use the number directionally.</strong> ISI is not a validated psychometric scale, audit, probability-of-failure model or certification. It is designed to improve inquiry.</div>
        <div class="isi-actions no-print"><button class="button" type="button" data-action="return">Return</button></div>
      </div>
    </section>`;
}

async function sendCompletionTelemetry(context) {
  const payload = sanitizeTelemetry(state.result, context);
  state.telemetrySent = true;
  if (!payload) return;
  try {
    await fetch(TELEMETRY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "omit",
      cache: "no-store",
      body: JSON.stringify(payload)
    });
  } catch {
    // The assessment never depends on telemetry succeeding.
  }
}

async function fetchStats() {
  try {
    const response = await fetch(STATS_URL, { credentials: "omit", cache: "no-store" });
    if (!response.ok) return;
    state.stats = await response.json();
    const target = $("#aggregateComparison");
    if (target && state.view === "results") target.outerHTML = renderAggregateComparison();
  } catch {
    // Aggregate comparison is optional.
  }
}

function saveSnapshot() {
  if (!state.initiativeName.trim()) {
    alert("Add an initiative name before saving a local snapshot. The name remains on this device.");
    return;
  }
  if (state.savedRun) return;

  const data = localData();
  const groupId = state.groupId || sessionStorage.getItem("isi_group_id_v2") || uid();
  state.groupId = groupId;
  sessionStorage.setItem("isi_group_id_v2", groupId);

  const run = {
    id: uid(),
    groupId,
    createdAt: new Date().toISOString(),
    initiativeName: state.initiativeName.trim(),
    perspective: selectedPerspectiveLabel(),
    answers: state.answers,
    result: state.result
  };

  data.runs.push(run);
  saveLocalData(data);
  state.savedRun = run;
  renderResults();
}

function addPerspective() {
  if (!state.savedRun) {
    if (!state.initiativeName.trim()) {
      alert("Add an initiative name and save the current snapshot before adding another perspective.");
      return;
    }
    saveSnapshot();
  }
  resetAssessment({ keepSetup: true });
  state.perspective = state.perspective === "Executive / Sponsor" ? "Program / Delivery" : "Executive / Sponsor";
  setView("assessment");
}

function calculateAndShow() {
  state.initiativeName = $("#initiativeName")?.value.trim() || state.initiativeName;
  state.perspective = $("#perspective")?.value || state.perspective;
  const result = calculateAssessment(state.answers);
  const warning = $("#assessmentWarning");

  if (result.answeredCount < 6) {
    if (warning) {
      warning.textContent = "Answer all six vectors. Use ? when you genuinely do not know.";
      warning.classList.remove("hidden");
    }
    return;
  }

  if (result.knownCount < 4) {
    if (warning) {
      warning.textContent = "At least four vectors need a 1–5 rating to calculate a directional ISI. Unknown remains a valid answer, but too little is visible for a composite score.";
      warning.classList.remove("hidden");
    }
    return;
  }

  state.result = result;
  state.telemetrySent = false;
  setView("results");
}

function clearLocalData() {
  if (!confirm("Delete all ISI snapshots stored in this browser?")) return;
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem("isi_group_id_v2");
  state.savedRun = null;
  state.groupId = null;
  renderResults();
}

function bind() {
  app.addEventListener("click", event => {
    const scoreButton = event.target.closest("[data-score]");
    if (scoreButton) {
      const vectorId = scoreButton.dataset.vector;
      const raw = scoreButton.dataset.score;
      state.answers[vectorId] = raw === "unknown" ? "unknown" : Number(raw);
      document.querySelectorAll(`[data-vector="${vectorId}"][data-score]`).forEach(button => {
        const active = button === scoreButton;
        button.classList.toggle("is-selected", active);
        button.setAttribute("aria-pressed", String(active));
      });
      return;
    }

    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;

    if (action === "intro") setView("intro");
    if (action === "assessment") {
      resetAssessment({ keepSetup: false });
      setView("assessment");
    }
    if (action === "calculate") calculateAndShow();
    if (action === "method") {
      state._returnView = state.view;
      setView("method");
    }
    if (action === "privacy") {
      state._returnView = state.view;
      setView("privacy");
    }
    if (action === "return") setView(state._returnView || "intro");
    if (action === "snapshot") saveSnapshot();
    if (action === "add-perspective") addPerspective();
    if (action === "print") window.print();
    if (action === "clear-local") clearLocalData();
  });

  app.addEventListener("input", event => {
    if (event.target.id === "initiativeName") state.initiativeName = event.target.value;
  });
  app.addEventListener("change", event => {
    if (event.target.id === "perspective") state.perspective = event.target.value;
  });
}

function render() {
  if (state.view === "assessment") renderAssessment();
  else if (state.view === "results" && state.result) renderResults();
  else if (state.view === "method") renderMethod();
  else if (state.view === "privacy") renderPrivacy();
  else renderIntro();
}

function initFromUrl() {
  const requested = new URLSearchParams(window.location.search).get("view");
  if (requested === "method" || requested === "privacy") state.view = requested;
  else if (requested === "setup" || requested === "assessment") state.view = "assessment";
  else state.view = "intro";
}

initFromUrl();
bind();
render();
