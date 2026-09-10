export const ISI_VERSION = "2.0.0";

export const RESPONSE_SCALE = [
  { value: 1, label: "Severe instability" },
  { value: 2, label: "Material instability" },
  { value: 3, label: "Tension / uncertain stability" },
  { value: 4, label: "Generally stable" },
  { value: 5, label: "Strongly stable" },
  { value: "unknown", label: "Unknown / insufficient visibility" }
];

export const PERSPECTIVE_OPTIONS = [
  "Executive / Sponsor",
  "Program / Delivery",
  "People Manager",
  "Frontline / End User"
];

export const VECTORS = [
  {
    id: "alignment",
    name: "Strategic Alignment Integrity",
    short: "Strategic Alignment",
    definition: "Whether the initiative still holds one coherent purpose, priority and definition of success across the organization.",
    question: "How consistently are leaders and affected business units still working from the same purpose, priorities and definition of success?"
  },
  {
    id: "leadership",
    name: "Leadership Reinforcement Consistency",
    short: "Leadership Reinforcement",
    definition: "Whether leadership attention, decisions and behavior consistently reinforce the initiative when pressure or trade-offs appear.",
    question: "How consistently do leaders reinforce the initiative through their attention, decisions and behavior when trade-offs or resistance appear?"
  },
  {
    id: "friction",
    name: "Stakeholder & Power Friction",
    short: "Stakeholder Friction",
    definition: "Whether competing interests, incentives and power tensions are being surfaced and resolved before they harden into obstruction.",
    question: "How effectively are competing interests, incentives and power tensions being surfaced and resolved before they disrupt the initiative?"
  },
  {
    id: "capacity",
    name: "Capability & Capacity Sufficiency",
    short: "Capability & Capacity",
    definition: "Whether the initiative can be sustained with the capability, ownership and operating capacity actually available.",
    question: "How sustainable is the initiative’s current execution capacity without relying on exceptional effort, scarce individuals or repeated diversion from other priorities?"
  },
  {
    id: "delivery",
    name: "Delivery Design Robustness",
    short: "Delivery Design",
    definition: "Whether the delivery approach can absorb failed assumptions, dependencies, risks and necessary changes in course.",
    question: "How resilient is the delivery plan to missed assumptions, dependencies, risks or necessary changes in course?"
  },
  {
    id: "adoption",
    name: "Adoption Momentum",
    short: "Adoption Momentum",
    definition: "Whether intended new ways of working are becoming normal, durable operating behavior.",
    question: "How consistently are the intended new ways of working being used and sustained in normal operations without repeated intervention or reversion?"
  }
];

const round = (n, digits = 2) => Number(n.toFixed(digits));
const avg = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const numericScore = value => typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 5;

export function classifyScore(score) {
  if (score == null) return { key: "insufficient", label: "Insufficient visibility", rank: 0 };
  if (score >= 4.2) return { key: "stable", label: "Stable", rank: 5 };
  if (score >= 3.5) return { key: "holding", label: "Holding", rank: 4 };
  if (score >= 2.75) return { key: "pressured", label: "Pressured", rank: 3 };
  if (score >= 2.0) return { key: "at-risk", label: "At Risk", rank: 2 };
  return { key: "critical", label: "Critical", rank: 1 };
}

export function classifyVisibility(score) {
  if (score == null) return { key: "unstated", label: "Not established" };
  if (score >= 1) return { key: "high", label: "High" };
  if (score >= 0.8) return { key: "moderate", label: "Moderate" };
  return { key: "limited", label: "Limited" };
}

export function calculateAssessment(answers) {
  const vectorResults = VECTORS.map(vector => {
    const raw = answers?.[vector.id];
    const score = numericScore(raw) ? Number(raw) : null;
    const unknown = raw === "unknown";

    return {
      id: vector.id,
      name: vector.name,
      short: vector.short,
      score,
      unknown,
      status: classifyScore(score)
    };
  });

  const answeredCount = vectorResults.filter(v => v.score != null || v.unknown).length;
  const known = vectorResults.filter(v => v.score != null);
  const knownCount = known.length;
  const unknownCount = vectorResults.filter(v => v.unknown).length;
  const visibilityScore = answeredCount === VECTORS.length ? knownCount / VECTORS.length : null;
  const overallScore = knownCount >= 4 ? avg(known.map(v => v.score)) : null;
  const strongest = known.length ? [...known].sort((a, b) => b.score - a.score)[0] : null;
  const weakest = known.length ? [...known].sort((a, b) => a.score - b.score)[0] : null;
  const spread = strongest && weakest ? strongest.score - weakest.score : null;

  const flags = [];
  if (weakest && weakest.score <= 2) {
    flags.push({ key: "weak-vector", label: "Critical weak point", detail: `${weakest.short} is materially unstable.` });
  }
  if (spread != null && spread >= 2) {
    flags.push({ key: "imbalance", label: "Structural imbalance", detail: `The gap between strongest and weakest vectors is ${round(spread)} points.` });
  }
  if (visibilityScore != null && visibilityScore < 1) {
    flags.push({ key: "low-visibility", label: "Incomplete visibility", detail: `${unknownCount} of 6 vectors were marked Unknown.` });
  }

  return {
    version: ISI_VERSION,
    overallScore: overallScore == null ? null : round(overallScore),
    status: classifyScore(overallScore),
    visibilityScore: visibilityScore == null ? null : round(visibilityScore, 3),
    visibility: classifyVisibility(visibilityScore),
    vectors: vectorResults,
    strongest,
    weakest,
    spread: spread == null ? null : round(spread),
    knownCount,
    unknownCount,
    answeredCount,
    complete: answeredCount === VECTORS.length && knownCount >= 4,
    telemetryEligible: answeredCount === VECTORS.length && knownCount === VECTORS.length,
    provisional: unknownCount > 0,
    flags
  };
}

function vectorMap(result) {
  return Object.fromEntries((result?.vectors || []).map(v => [v.id, v]));
}

export function calculateVolatility(current, previous, previousPrevious = null) {
  if (!current?.complete || !previous?.complete || current.knownCount !== 6 || previous.knownCount !== 6) {
    return { available: false, label: "No comparable prior snapshot", key: "none", deltas: [] };
  }

  const c = vectorMap(current);
  const p = vectorMap(previous);
  const pp = previousPrevious?.complete && previousPrevious.knownCount === 6 ? vectorMap(previousPrevious) : null;
  const deltas = VECTORS.map(v => ({ id: v.id, short: v.short, delta: round(c[v.id].score - p[v.id].score) }));
  const absMean = avg(deltas.map(d => Math.abs(d.delta)));
  const materialMoves = deltas.filter(d => Math.abs(d.delta) >= 1).length;
  const materialDrops = deltas.filter(d => d.delta <= -1).length;
  const severeDrops = deltas.filter(d => d.delta <= -2).length;
  const maxDrop = Math.min(...deltas.map(d => d.delta));

  let acceleratingVectors = 0;
  if (pp) {
    for (const v of VECTORS) {
      const priorDelta = p[v.id].score - pp[v.id].score;
      const currentDelta = c[v.id].score - p[v.id].score;
      if (currentDelta < 0 && currentDelta < priorDelta) acceleratingVectors += 1;
    }
  }

  let key = "low";
  if (materialMoves >= 1 || absMean >= 0.5) key = "moderate";
  if (materialMoves >= 3 || severeDrops >= 1 || absMean >= 0.85) key = "elevated";
  if (materialMoves >= 4 || severeDrops >= 2 || maxDrop <= -2 || absMean >= 1.15) key = "high";
  if (acceleratingVectors >= 2 && key === "moderate") key = "elevated";
  if (acceleratingVectors >= 3) key = "high";

  const labels = { low: "Low", moderate: "Moderate", elevated: "Elevated", high: "High" };
  const largestDrop = [...deltas].sort((a, b) => a.delta - b.delta)[0];

  return {
    available: true,
    key,
    label: labels[key],
    deltas,
    meanAbsoluteMovement: round(absMean),
    materialMoves,
    materialDrops,
    severeDrops,
    acceleratingVectors,
    largestDrop
  };
}

export function comparePerspectives(results) {
  const valid = (results || []).filter(r => r?.complete && r.knownCount === 6);
  if (valid.length < 2) return { available: false, count: valid.length };

  const vectorGaps = VECTORS.map(v => {
    const scores = valid.map(r => vectorMap(r)[v.id].score);
    return {
      id: v.id,
      short: v.short,
      min: Math.min(...scores),
      max: Math.max(...scores),
      gap: round(Math.max(...scores) - Math.min(...scores))
    };
  });
  const overallScores = valid.map(r => r.overallScore);
  const overallGap = round(Math.max(...overallScores) - Math.min(...overallScores));
  const largest = [...vectorGaps].sort((a, b) => b.gap - a.gap)[0];
  const key = largest.gap >= 2 || overallGap >= 1.25 ? "high" : largest.gap >= 1 || overallGap >= 0.75 ? "material" : "contained";
  const labels = { contained: "Contained", material: "Material", high: "High" };

  return { available: true, count: valid.length, overallGap, vectorGaps, largestGap: largest, key, label: labels[key] };
}

const PATTERNS = [
  {
    id: "systemic-pressure", priority: 100, title: "Systemic Pressure",
    when: ({ result }) => result.vectors.filter(x => x.score != null && x.score <= 3).length >= 4,
    interpretation: "Pressure is distributed across the initiative rather than isolated to one weak point.",
    question: "If only one source of pressure could be reduced now, which one would release the most strain elsewhere?"
  },
  {
    id: "execution-overload", priority: 95, title: "Execution Overload",
    when: ({ v }) => v.alignment.score >= 4 && v.leadership.score >= 4 && v.capacity.score != null && v.capacity.score <= 2,
    interpretation: "Strategic commitment is stronger than the capacity available to carry it. Progress may be relying on overload.",
    question: "What work is being sustained through exceptional effort rather than normal operating capacity?"
  },
  {
    id: "political-drag", priority: 92, title: "Political Drag",
    when: ({ v }) => v.alignment.score >= 4 && v.friction.score != null && v.friction.score <= 2,
    interpretation: "Formal alignment coexists with unresolved stakeholder or power friction.",
    question: "Who loses influence, control, status or convenience if this initiative succeeds?"
  },
  {
    id: "adoption-stall", priority: 90, title: "Adoption Stall",
    when: ({ v }) => v.delivery.score >= 4 && v.capacity.score >= 3 && v.adoption.score != null && v.adoption.score <= 2,
    interpretation: "The initiative appears deliverable, but the intended change is not becoming normal operating behavior.",
    question: "What is preventing delivered capability from becoming normal operating behavior?"
  },
  {
    id: "brittle-momentum", priority: 88, title: "Brittle Momentum",
    when: ({ v }) => v.adoption.score >= 4 && ((v.delivery.score != null && v.delivery.score <= 2) || (v.capacity.score != null && v.capacity.score <= 2)),
    interpretation: "Adoption is ahead of the structures required to sustain it.",
    question: "Which part of current adoption would be hardest to sustain if additional support disappeared tomorrow?"
  },
  {
    id: "strategic-drift", priority: 86, title: "Strategic Drift",
    when: ({ v }) => v.alignment.score != null && v.alignment.score <= 2,
    interpretation: "The initiative’s purpose, priorities or definition of success no longer appear sufficiently coherent.",
    question: "Which recent decision most clearly changed what this initiative is actually trying to accomplish?"
  },
  {
    id: "designed-but-unsupported", priority: 82, title: "Designed but Unsupported",
    when: ({ v }) => v.delivery.score >= 4 && v.capacity.score != null && v.capacity.score <= 2,
    interpretation: "The delivery approach is stronger than the capacity available to execute it.",
    question: "Which delivery assumption depends on capacity the organization does not actually have?"
  },
  {
    id: "uneven-system", priority: 78, title: "Uneven System",
    when: ({ result }) => result.spread != null && result.spread >= 2,
    interpretation: "Strong conditions are masking materially weaker ones elsewhere in the initiative.",
    question: "Which strong area is currently compensating for the weakest one, and how long can that continue?"
  },
  {
    id: "emerging-deterioration", priority: 96, title: "Emerging Deterioration",
    when: ({ result, volatility }) => result.overallScore >= 3.5 && volatility?.available && ["elevated", "high"].includes(volatility.key) && volatility.materialDrops >= 2,
    interpretation: "The overall score still looks comparatively healthy, but several vectors are moving in the wrong direction.",
    question: "What changed between the last two snapshots that could explain deterioration across several vectors?"
  },
  {
    id: "perspective-fracture", priority: 98, title: "Perspective Fracture",
    when: ({ perspective }) => perspective?.available && (perspective.largestGap.gap >= 2 || perspective.overallGap >= 1.25),
    interpretation: "Different organizational vantage points are producing materially different readings of the same initiative.",
    question: "What does the group closest to the weakest operating reality see that other vantage points may not?"
  }
];

export function diagnose(result, volatility = null, perspective = null) {
  if (!result?.complete) return [];
  const v = vectorMap(result);
  return PATTERNS
    .filter(pattern => {
      try { return pattern.when({ result, v, volatility, perspective }); }
      catch { return false; }
    })
    .sort((a, b) => b.priority - a.priority)
    .map(({ when, priority, ...rest }) => rest);
}

export function buildObservations(result, volatility = null, patterns = [], perspective = null) {
  if (!result?.complete) return [];
  const observations = [];

  if (result.overallScore != null) {
    const qualifier = result.provisional ? "provisional " : "";
    observations.push(`The ${qualifier}ISI is ${result.overallScore.toFixed(2)} / 5, in the ${result.status.label} range. ${result.strongest.short} is strongest; ${result.weakest.short} is weakest.`);
  }

  if (result.unknownCount > 0) {
    observations.push(`${result.unknownCount} of 6 vectors were marked Unknown. Visibility is ${result.visibility.label.toLowerCase()}, so the composite should be read with caution.`);
  }

  if (volatility?.available && volatility.largestDrop?.delta < 0) {
    observations.push(`Volatility is ${volatility.label.toLowerCase()}. The largest deterioration is ${volatility.largestDrop.short} at ${volatility.largestDrop.delta.toFixed(0)} point${Math.abs(volatility.largestDrop.delta) === 1 ? "" : "s"}.`);
  }

  if (perspective?.available) {
    observations.push(`Perspective divergence is ${perspective.label.toLowerCase()}. The largest gap is ${perspective.largestGap.short} at ${perspective.largestGap.gap.toFixed(0)} point${perspective.largestGap.gap === 1 ? "" : "s"}.`);
  }

  if (patterns.length) observations.push(patterns[0].interpretation);
  return observations.slice(0, 3);
}

export function questionsWorthExamining(result, patterns = []) {
  const unique = [];
  for (const pattern of patterns) {
    if (!unique.includes(pattern.question)) unique.push(pattern.question);
    if (unique.length === 3) return unique;
  }

  const fallbacks = {
    alignment: "Where is the initiative’s purpose most likely to mean something different to different groups?",
    leadership: "Where is leadership behavior least consistent with the priority leaders say this initiative has?",
    friction: "Which stakeholder tension is most likely to remain invisible until it begins affecting delivery?",
    capacity: "Which part of delivery is most dependent on unsustainable effort or scarce capability?",
    delivery: "Which assumption or dependency would create the largest disruption if it failed now?",
    adoption: "Where is apparent adoption most likely to be compliance, workaround behavior or temporary momentum?"
  };

  if (result?.weakest) unique.push(fallbacks[result.weakest.id]);
  unique.push("What would have to become true for the weakest vector to move one point higher?");
  unique.push("Which conclusion about this initiative would be most damaging if it turned out to be wrong?");
  return [...new Set(unique)].slice(0, 3);
}

export function sanitizeTelemetry(result, context = {}) {
  if (!result?.telemetryEligible) return null;
  const vectorScores = Object.fromEntries(result.vectors.map(v => [v.id, v.score]));
  return {
    event: "complete",
    version: ISI_VERSION,
    overall: result.overallScore,
    vectors: vectorScores,
    visibility: result.visibilityScore,
    unknownCount: result.unknownCount,
    status: result.status.key,
    volatility: context.volatility?.available ? context.volatility.key : "none",
    perspectiveCount: clamp(Number(context.perspectiveCount || 1), 1, 10)
  };
}
