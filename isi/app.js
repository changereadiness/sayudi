import {
  ISI_VERSION,
  RESPONSE_SCALE,
  EVIDENCE_OPTIONS,
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

const STORAGE_KEY = "sayudi_isi_local_v1";
const TELEMETRY_URL = "/api/isi/telemetry";
const STATS_URL = `/api/isi/stats?version=${encodeURIComponent(ISI_VERSION)}`;
const MIN_COMPARISON_SAMPLE = 100;

const state = {
  view: "intro",
  vectorIndex: 0,
  initiativeName: "",
  perspective: "Executive / Sponsor",
  customPerspective: "",
  answers: Object.fromEntries(VECTORS.map(v => [v.id, Array(v.questions.length).fill(null)])),
  evidence: Object.fromEntries(VECTORS.map(v => [v.id, null])),
  result: null,
  savedRun: null,
  telemetrySent: false,
  stats: null,
  groupId: null
};

const $ = sel => document.querySelector(sel);
const app = $("#app");

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
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
}

function esc(value = "") {
  return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
}

function selectedPerspectiveLabel() {
  return state.perspective === "Other" ? (state.customPerspective.trim() || "Other") : state.perspective;
}

function resetAssessment({ keepSetup = true } = {}) {
  state.vectorIndex = 0;
  if (!keepSetup) {
    state.initiativeName = "";
    state.perspective = "Executive / Sponsor";
    state.customPerspective = "";
    state.groupId = null;
    sessionStorage.removeItem("isi_group_id");
  }
  state.answers = Object.fromEntries(VECTORS.map(v => [v.id, Array(v.questions.length).fill(null)]));
  state.evidence = Object.fromEntries(VECTORS.map(v => [v.id, null]));
  state.result = null;
  state.savedRun = null;
  state.telemetrySent = false;
}

function renderHeader() {
  return `
    <header class="site-header no-print">
      <a class="wordmark" href="../index.html" aria-label="Return to Sayudi">SAYUDI</a>
      <div class="header-meta"><span>Initiative Stability Index</span><button class="text-button" data-action="privacy">Privacy</button></div>
    </header>`;
}

function renderIntro() {
  app.innerHTML = `${renderHeader()}
    <main>
      <section class="hero shell">
        <div class="eyebrow">SAYUDI OPEN TOOL · ISI ${ISI_VERSION}</div>
        <h1>Initiatives rarely fail all at once. They become unstable first.</h1>
        <p class="hero-lead">The Initiative Stability Index examines six structural conditions across an active initiative: stability, visibility, movement over time and divergence between organizational perspectives.</p>
        <div class="principle">Free means free. Your assessment belongs to you.</div>
        <div class="hero-actions">
          <button class="primary" data-action="setup">Run the Index</button>
          <button class="secondary" data-action="method">How it works</button>
        </div>
        <p class="privacy-short">No account. No email. No AI. Initiative names, individual answers, saved snapshots and reports remain on your device. Sayudi retains only anonymous aggregate assessment statistics.</p>
      </section>
      <section class="shell intro-grid">
        <article><span>01</span><h2>Stability</h2><p>Where the initiative stands across six structural vectors.</p></article>
        <article><span>02</span><h2>Volatility</h2><p>What is moving, deteriorating or becoming uneven across saved snapshots.</p></article>
        <article><span>03</span><h2>Visibility</h2><p>How much confidence the evidence supports, including what remains unknown.</p></article>
        <article><span>04</span><h2>Perspective</h2><p>Where different organizational vantage points produce materially different readings.</p></article>
      </section>
    </main>`;
}

function renderSetup() {
  const perspectiveOptions = PERSPECTIVE_OPTIONS.map(p => `<option ${state.perspective===p?"selected":""}>${esc(p)}</option>`).join("");
  app.innerHTML = `${renderHeader()}
    <main class="shell setup">
      <div class="eyebrow">ASSESSMENT SETUP</div>
      <h1>Set the vantage point.</h1>
      <p class="section-lead">Assess one active initiative from one vantage point at a time. The initiative name and perspective label are local-only and are never included in telemetry.</p>
      <div class="form-card">
        <label>Initiative name <span>Optional for a one-time assessment; required to save snapshots.</span>
          <input id="initiativeName" type="text" maxlength="120" value="${esc(state.initiativeName)}" placeholder="Local-only label">
        </label>
        <label>Perspective
          <select id="perspective">${perspectiveOptions}</select>
        </label>
        <label id="customPerspectiveWrap" class="${state.perspective==='Other'?'':'hidden'}">Perspective label <span>Stored only on this device.</span>
          <input id="customPerspective" type="text" maxlength="80" value="${esc(state.customPerspective)}" placeholder="e.g. Operations lead">
        </label>
      </div>
      <div class="actions"><button class="secondary" data-action="intro">Back</button><button class="primary" data-action="begin">Begin assessment</button></div>
    </main>`;
}

function vectorProgress() {
  const completeVectors = VECTORS.filter(v => {
    const answered = state.answers[v.id].filter(x => x !== null).length === v.questions.length;
    return answered && state.evidence[v.id];
  }).length;
  return `${completeVectors} / ${VECTORS.length} vectors complete`;
}

function renderAssessment() {
  const vector = VECTORS[state.vectorIndex];
  const questions = vector.questions.map((q, qi) => {
    const current = state.answers[vector.id][qi];
    const options = RESPONSE_SCALE.map(o => `
      <button type="button" class="score-option ${current===o.value?'selected':''} ${o.value==='unknown'?'unknown':''}" data-score="${o.value}" data-q="${qi}">
        <strong>${o.value === 'unknown' ? '?' : o.value}</strong><span>${esc(o.label)}</span>
      </button>`).join("");
    return `<fieldset class="question"><legend>${qi+1}. ${esc(q)}</legend><div class="score-grid">${options}</div></fieldset>`;
  }).join("");

  const evidenceOptions = EVIDENCE_OPTIONS.map(o => `
    <button type="button" class="evidence-option ${state.evidence[vector.id]===o.value?'selected':''}" data-evidence="${o.value}">
      <strong>${o.label}</strong><span>${o.description}</span>
    </button>`).join("");

  app.innerHTML = `${renderHeader()}
    <main class="assessment-shell">
      <aside class="assessment-nav no-print">
        <div class="nav-label">${esc(state.initiativeName || "Unnamed initiative")}</div>
        <div class="nav-perspective">${esc(selectedPerspectiveLabel())}</div>
        <div class="nav-progress">${vectorProgress()}</div>
        <nav>${VECTORS.map((v,i) => `<button data-jump="${i}" class="${i===state.vectorIndex?'active':''}"><span>${String(i+1).padStart(2,'0')}</span>${v.short}</button>`).join("")}</nav>
      </aside>
      <section class="assessment-main">
        <div class="eyebrow">VECTOR ${String(state.vectorIndex+1).padStart(2,'0')} OF 06</div>
        <h1>${vector.name}</h1>
        <p class="section-lead">${vector.definition}</p>
        <div class="questions">${questions}</div>
        <div class="evidence-card">
          <h2>Evidence basis</h2>
          <p>This affects Visibility only. It does not change the stability score.</p>
          <div class="evidence-grid">${evidenceOptions}</div>
        </div>
        <div id="vectorWarning" class="inline-warning hidden">Answer every condition, including Unknown where necessary, and select an evidence basis.</div>
        <div class="actions no-print">
          <button class="secondary" data-action="previous">${state.vectorIndex===0?'Setup':'Previous vector'}</button>
          <button class="primary" data-action="next">${state.vectorIndex===VECTORS.length-1?'Calculate ISI':'Next vector'}</button>
        </div>
      </section>
    </main>`;
}

function findPriorRuns() {
  if (!state.initiativeName.trim()) return { previous: null, previousPrevious: null, perspectives: [] };
  const data = localData();
  const initiative = state.initiativeName.trim().toLowerCase();
  const perspective = selectedPerspectiveLabel().toLowerCase();
  const samePerspective = data.runs
    .filter(r => r.id !== state.savedRun?.id && r.initiativeName?.toLowerCase() === initiative && r.perspective?.toLowerCase() === perspective && r.result?.complete)
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const groupId = state.groupId || state.savedRun?.groupId;
  const sameGroup = groupId ? data.runs.filter(r => r.groupId === groupId && r.result?.complete) : [];
  return { previous: samePerspective[0]?.result || null, previousPrevious: samePerspective[1]?.result || null, perspectives: sameGroup.map(r => r.result) };
}

function barWidth(score) { return score == null ? 0 : ((score - 1) / 4) * 100; }

function renderResults() {
  const prior = findPriorRuns();
  const volatility = calculateVolatility(state.result, prior.previous, prior.previousPrevious);
  const groupId = state.groupId || state.savedRun?.groupId;
  const savedPerspectiveResults = groupId ? localData().runs.filter(r => r.groupId === groupId && r.result?.complete).map(r => r.result) : [];
  const perspectiveResults = state.savedRun ? savedPerspectiveResults : [...savedPerspectiveResults, state.result];
  const perspective = comparePerspectives(perspectiveResults);
  const patterns = diagnose(state.result, volatility, perspective);
  const observations = buildObservations(state.result, volatility, patterns, perspective);
  const questions = questionsWorthExamining(state.result, patterns);

  const vectorRows = state.result.vectors.map(v => {
    const delta = volatility.available ? volatility.deltas.find(d => d.id===v.id)?.delta : null;
    const deltaText = delta == null ? "" : `<span class="delta ${delta<0?'down':delta>0?'up':''}">${delta>0?'+':''}${delta.toFixed(2)}</span>`;
    return `<div class="vector-result">
      <div class="vector-result-head"><strong>${v.short}</strong><span>${v.score.toFixed(2)} ${deltaText}</span></div>
      <div class="bar"><i style="width:${barWidth(v.score)}%"></i></div>
      <div class="vector-meta"><span>${v.status.label}</span><span>Visibility: ${Math.round(v.visibility*100)}%</span></div>
    </div>`;
  }).join("");

  const patternCards = patterns.slice(0,4).map(p => `<article class="pattern"><div class="eyebrow">PATTERN DETECTED</div><h3>${p.title}</h3><p>${p.interpretation}</p></article>`).join("") || `<p class="muted">No named diagnostic pattern crossed its current rule threshold. The vector profile and examination questions remain the primary reading.</p>`;

  const comparison = renderAggregateComparison();

  const reportDate = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  app.innerHTML = `${renderHeader()}
    <main class="results shell">
      <section class="result-hero">
        <div><div class="eyebrow">INITIATIVE STABILITY INDEX</div><div class="result-local-meta"><strong>${esc(state.initiativeName || "Unnamed initiative")}</strong> · ${esc(selectedPerspectiveLabel())} · ${esc(reportDate)}</div><h1>${state.result.overallScore.toFixed(2)}<span>/ 5</span></h1><div class="status status-${state.result.status.key}">${state.result.status.label}</div></div>
        <div class="result-meta">
          <div><span>Visibility</span><strong>${state.result.visibility.label}</strong><small>${Math.round(state.result.visibilityScore*100)}%</small></div>
          <div><span>Volatility</span><strong>${volatility.label}</strong><small>${volatility.available ? `${volatility.materialMoves} material vector move${volatility.materialMoves===1?'':'s'}` : 'Requires another snapshot'}</small></div>
          <div><span>Perspective gap</span><strong>${perspective.available ? perspective.label : 'Not compared'}</strong><small>${perspective.available ? `${perspective.count} perspectives` : 'Add another vantage point'}</small></div>
        </div>
      </section>

      <section class="result-grid">
        <div><div class="eyebrow">STRUCTURAL PROFILE</div>${vectorRows}</div>
        <aside class="result-summary">
          <div><span>Strongest support</span><strong>${state.result.strongest.short}</strong><small>${state.result.strongest.score.toFixed(2)}</small></div>
          <div><span>Primary vulnerability</span><strong>${state.result.weakest.short}</strong><small>${state.result.weakest.score.toFixed(2)}</small></div>
          <div><span>Unknown conditions</span><strong>${state.result.unknownCount} / 30</strong><small>Unknown reduces visibility; it is never scored as neutral.</small></div>
        </aside>
      </section>

      <section class="analysis-section"><div class="eyebrow">WHAT THE PROFILE SUGGESTS</div>${observations.map(o=>`<p>${o}</p>`).join("")}</section>
      <section class="patterns-section"><div class="eyebrow">DIAGNOSTIC PATTERNS</div><div class="pattern-grid">${patternCards}</div></section>
      <section class="questions-section"><div class="eyebrow">QUESTIONS WORTH EXAMINING</div>${questions.map((q,i)=>`<div class="exam-question"><span>0${i+1}</span><p>${q}</p></div>`).join("")}</section>
      ${comparison}

      <section class="local-section no-print">
        <div><div class="eyebrow">LOCAL CONTINUITY</div><h2>Keep the assessment yours.</h2><p>Saving a snapshot stores the initiative name, answers and result only in this browser. Nothing in the snapshot is uploaded to Sayudi.</p></div>
        <div class="local-actions">
          <button class="primary" data-action="snapshot">${state.savedRun ? 'Snapshot saved locally' : 'Save snapshot locally'}</button>
          <button class="secondary" data-action="add-perspective">Add another perspective</button>
          <button class="secondary" data-action="print">Save / print PDF</button>
          <button class="text-button danger" data-action="clear-local">Delete all local ISI data</button>
        </div>
      </section>
      <section class="privacy-footer"><strong>Private by design.</strong> Individual answers, initiative names, perspective labels, snapshots and reports remain on this device. Anonymous aggregate statistics are retained only after a completed assessment. <button class="text-button no-print" data-action="privacy">See exactly what is collected.</button></section>
    </main>`;

  if (!state.telemetrySent) sendCompletionTelemetry({ volatility, perspectiveCount: perspectiveResults.length });
  fetchStats();
}

function renderAggregateComparison() {
  if (!state.stats || Number(state.stats.completed || 0) < MIN_COMPARISON_SAMPLE) {
    return `<section id="aggregateComparison" class="aggregate-section"><div class="eyebrow">COMPARISON</div><h2>Comparison data is still accumulating.</h2><p>Aggregate comparison appears after ${MIN_COMPARISON_SAMPLE} completed ISI assessments. It will describe completed ISI assessments only; it is not presented as an external benchmark.</p></section>`;
  }
  const avgOverall = Number(state.stats.averages?.overall || 0);
  const diff = state.result.overallScore - avgOverall;
  return `<section id="aggregateComparison" class="aggregate-section"><div class="eyebrow">COMPLETED ISI ASSESSMENTS</div><h2>${Number(state.stats.completed).toLocaleString()} assessments. Average ISI ${avgOverall.toFixed(2)}.</h2><p>Your current result is ${Math.abs(diff).toFixed(2)} points ${diff>=0?'above':'below'} the aggregate average of completed assessments. This is a descriptive comparison, not a representative industry benchmark.</p></section>`;
}

function renderPrivacy() {
  app.innerHTML = `${renderHeader()}
    <main class="shell privacy-page">
      <div class="eyebrow">PRIVACY BY DESIGN</div>
      <h1>Free means free. Your assessment belongs to you.</h1>
      <p class="section-lead">ISI is designed so the useful assessment data remains on your device while Sayudi learns only from anonymous aggregates.</p>
      <div class="privacy-columns">
        <section><h2>Never sent to Sayudi</h2><p>Initiative name, individual question responses, perspective labels, locally saved snapshots, diagnostic report content, or generated/printed PDFs.</p></section>
        <section><h2>Sent after completion</h2><p>ISI version, overall score, six vector scores, aggregate visibility score, number of Unknown responses, stability classification, volatility classification when available, and number of perspectives included in the local comparison.</p></section>
        <section><h2>What the server retains</h2><p>Running counts, score sums, score distributions and monthly aggregate counters. The telemetry backend is designed not to create or retain a row for an individual assessment.</p></section>
      </div>
      <div class="privacy-note"><strong>Infrastructure note.</strong> Hosting and network providers necessarily process technical request data to deliver a web service. Sayudi’s ISI application does not write IP addresses, user agents, cookies, device identifiers or referrers into its assessment database, and the supplied Worker configuration disables persistent Worker observability logs.</div>
      <div class="actions"><button class="primary" data-action="return">Return</button></div>
    </main>`;
}

function renderMethod() {
  app.innerHTML = `${renderHeader()}
    <main class="shell method-page">
      <div class="eyebrow">METHOD</div><h1>What ISI measures—and what it does not.</h1>
      <p class="section-lead">ISI is a structured diagnostic instrument for examining current initiative conditions. It is not a validated psychometric scale, a probability-of-failure model, an audit, or a substitute for direct organizational inquiry.</p>
      <div class="method-grid">
        ${VECTORS.map((v,i)=>`<article><span>0${i+1}</span><h2>${v.name}</h2><p>${v.definition}</p></article>`).join("")}
      </div>
      <section class="method-rules"><h2>Scoring rules</h2><p>Each vector contains five conditions scored from 1 to 5, plus Unknown. Unknown is excluded from the stability score and reduces Visibility. At least three known responses are required per vector; all six vectors must be scorable, and an evidence basis must be stated for every vector, before an overall ISI is calculated. The six vectors carry equal weight.</p><p>Score bands are descriptive heuristics: Stable 4.20–5.00; Holding 3.50–4.19; Pressured 2.75–3.49; At Risk 2.00–2.74; Critical 1.00–1.99. They should be interpreted alongside the weakest vector, structural imbalance, visibility, volatility and perspective divergence.</p></section>
      <div class="actions"><button class="primary" data-action="return">Return</button></div>
    </main>`;
}

function vectorIsComplete(index) {
  const v = VECTORS[index];
  return state.answers[v.id].every(a => a !== null) && !!state.evidence[v.id];
}

async function sendCompletionTelemetry(context) {
  const payload = sanitizeTelemetry(state.result, context);
  if (!payload) return;
  state.telemetrySent = true;
  try {
    await fetch(TELEMETRY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "omit",
      cache: "no-store",
      body: JSON.stringify(payload)
    });
  } catch {
    // Telemetry is deliberately non-essential. The assessment remains fully functional if it fails.
  }
}

async function fetchStats() {
  try {
    const response = await fetch(STATS_URL, { credentials: "omit", cache: "no-store" });
    if (!response.ok) return;
    const stats = await response.json();
    state.stats = stats;
    const target = $("#aggregateComparison");
    if (target && state.view === "results") target.outerHTML = renderAggregateComparison();
  } catch {
    // Public aggregate comparison is optional.
  }
}

function saveSnapshot() {
  if (!state.initiativeName.trim()) {
    alert("Add an initiative name before saving a local snapshot. The name remains on this device.");
    return;
  }
  if (state.savedRun) return;
  const data = localData();
  const groupId = state.groupId || sessionStorage.getItem("isi_group_id") || uid();
  state.groupId = groupId;
  sessionStorage.setItem("isi_group_id", groupId);
  const run = {
    id: uid(),
    groupId,
    createdAt: new Date().toISOString(),
    initiativeName: state.initiativeName.trim(),
    perspective: selectedPerspectiveLabel(),
    answers: state.answers,
    evidence: state.evidence,
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
  state.perspective = "Program / Delivery";
  state.customPerspective = "";
  state.view = "setup";
  render();
}

function calculateAndShow() {
  state.result = calculateAssessment(state.answers, state.evidence);
  if (!state.result.complete) return;
  state.view = "results";
  renderResults();
}

function bind() {
  app.addEventListener("click", event => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    const scoreBtn = event.target.closest("[data-score]");
    const evidenceBtn = event.target.closest("[data-evidence]");
    const jump = event.target.closest("[data-jump]");

    if (scoreBtn) {
      const vector = VECTORS[state.vectorIndex];
      const q = Number(scoreBtn.dataset.q);
      state.answers[vector.id][q] = scoreBtn.dataset.score === "unknown" ? "unknown" : Number(scoreBtn.dataset.score);
      renderAssessment(); return;
    }
    if (evidenceBtn) {
      const vector = VECTORS[state.vectorIndex];
      state.evidence[vector.id] = evidenceBtn.dataset.evidence;
      renderAssessment(); return;
    }
    if (jump) { state.vectorIndex = Number(jump.dataset.jump); renderAssessment(); return; }
    if (!action) return;

    if (action === "setup") { resetAssessment({ keepSetup: false }); state.view = "setup"; renderSetup(); }
    if (action === "intro") { state.view = "intro"; renderIntro(); }
    if (action === "method") { state.view = "method"; renderMethod(); }
    if (action === "privacy") { state._returnView = state.view; state.view = "privacy"; renderPrivacy(); }
    if (action === "return") { state.view = state._returnView || "intro"; render(); }
    if (action === "begin") {
      state.initiativeName = $("#initiativeName")?.value.trim() || "";
      state.perspective = $("#perspective")?.value || "Executive / Sponsor";
      state.customPerspective = $("#customPerspective")?.value.trim() || "";
      state.view = "assessment"; state.vectorIndex = 0; renderAssessment();
    }
    if (action === "previous") {
      if (state.vectorIndex === 0) { state.view = "setup"; renderSetup(); }
      else { state.vectorIndex -= 1; renderAssessment(); }
    }
    if (action === "next") {
      if (!vectorIsComplete(state.vectorIndex)) {
        $("#vectorWarning")?.classList.remove("hidden"); return;
      }
      if (state.vectorIndex < VECTORS.length - 1) { state.vectorIndex += 1; renderAssessment(); }
      else calculateAndShow();
    }
    if (action === "snapshot") saveSnapshot();
    if (action === "add-perspective") addPerspective();
    if (action === "print") window.print();
    if (action === "clear-local") {
      if (confirm("Delete all ISI snapshots stored in this browser? This cannot be undone.")) {
        localStorage.removeItem(STORAGE_KEY); sessionStorage.removeItem("isi_group_id"); state.savedRun = null; renderResults();
      }
    }
  });

  app.addEventListener("change", event => {
    if (event.target.id === "perspective") {
      state.perspective = event.target.value;
      $("#customPerspectiveWrap")?.classList.toggle("hidden", state.perspective !== "Other");
    }
  });
}

function render() {
  if (state.view === "intro") renderIntro();
  else if (state.view === "setup") renderSetup();
  else if (state.view === "assessment") renderAssessment();
  else if (state.view === "results") renderResults();
  else if (state.view === "privacy") renderPrivacy();
  else if (state.view === "method") renderMethod();
}

const requestedView = new URLSearchParams(window.location.search).get("view");
if (["intro", "setup", "method", "privacy"].includes(requestedView)) state.view = requestedView;

bind();
render();
