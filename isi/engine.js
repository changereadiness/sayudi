export const ISI_VERSION = "1.0.0";

export const RESPONSE_SCALE = [
  { value: 1, label: "Severe instability" },
  { value: 2, label: "Material instability" },
  { value: 3, label: "Tension / uncertain stability" },
  { value: 4, label: "Generally stable" },
  { value: 5, label: "Strongly stable" },
  { value: "unknown", label: "Unknown / insufficient visibility" }
];

export const EVIDENCE_OPTIONS = [
  { value: "direct", factor: 1.0, label: "Direct", description: "Recent observable evidence or direct operational knowledge." },
  { value: "mixed", factor: 0.75, label: "Mixed", description: "A combination of evidence, observation and inference." },
  { value: "perception", factor: 0.5, label: "Perception", description: "Primarily judgment, assumption or second-hand information." }
];

export const PERSPECTIVE_OPTIONS = [
  "Executive / Sponsor",
  "Program / Delivery",
  "People Manager",
  "Frontline / End User",
  "Other"
];

export const VECTORS = [
  {
    id: "alignment",
    name: "Strategic Alignment Integrity",
    short: "Strategic Alignment",
    definition: "Whether the initiative retains a coherent purpose, priority and scope as decisions move through the organization.",
    questions: [
      "Over the past 30 days, how consistently have executive sponsors described the same strategic purpose and intended outcomes?",
      "How consistently have material decisions reinforced, rather than diluted, the initiative’s stated objectives?",
      "How well are affected business-unit priorities aligned with what the initiative requires?",
      "How controlled and intentional have changes to scope been relative to the agreed baseline?",
      "How clearly can leaders below the executive level explain why the initiative matters and what success means?"
    ]
  },
  {
    id: "leadership",
    name: "Leadership Reinforcement Consistency",
    short: "Leadership Reinforcement",
    definition: "Whether leadership attention, behavior and intervention consistently reinforce the direction of the initiative.",
    questions: [
      "Over the past 30 days, how consistently have primary sponsors visibly reinforced the initiative in formal forums?",
      "How consistently are leaders modeling the behaviors and decisions the initiative requires?",
      "How regularly is initiative progress reviewed and followed by consequential leadership decisions when needed?",
      "When resistance or drift appears, how consistently do leaders intervene to reinforce direction?",
      "How consistent are senior-leader signals about commitment, priority and required trade-offs?"
    ]
  },
  {
    id: "friction",
    name: "Stakeholder & Power Friction",
    short: "Stakeholder Friction",
    definition: "Whether shifts in influence, incentives and informal power are being surfaced and resolved rather than accumulating beneath formal alignment.",
    questions: [
      "How effectively have shifts in influence, control or status created by the initiative been surfaced and addressed?",
      "How safely and openly are impacted groups raising concerns before those concerns harden into resistance?",
      "How effectively are informal influencers aligned with, or constructively engaged in, the initiative?",
      "How closely do stakeholder incentives and consequences align with the initiative’s intended outcomes?",
      "How effectively are escalation channels resolving tension without creating avoidance, delay or political blockage?"
    ]
  },
  {
    id: "capacity",
    name: "Capability & Capacity Sufficiency",
    short: "Capability & Capacity",
    definition: "Whether the initiative has enough protected time, capability, ownership and sustainable operating capacity to execute.",
    questions: [
      "Over the past 30 days, how adequate has dedicated capacity been for advancing the initiative?",
      "How well do critical delivery roles possess the capabilities required to execute their responsibilities?",
      "How effectively is initiative capacity protected from competing priorities and unplanned diversion?",
      "How clear and durable is ownership across all critical workstreams?",
      "How sustainable is the current execution pace over the next 90 days without relying on exceptional effort?"
    ]
  },
  {
    id: "delivery",
    name: "Delivery Design Robustness",
    short: "Delivery Design",
    definition: "Whether milestones, dependencies, risks, success criteria and adaptation mechanisms are strong enough to absorb execution pressure.",
    questions: [
      "How realistic are current milestone timelines relative to the initiative’s complexity and available capacity?",
      "How actively are dependencies across workstreams identified, owned and managed?",
      "How consistently are material risks and assumptions reviewed and acted upon?",
      "How clearly defined and measurable are success criteria for the next 90 days?",
      "If a critical assumption fails, how prepared is the team to adapt without losing control of delivery?"
    ]
  },
  {
    id: "adoption",
    name: "Adoption Momentum",
    short: "Adoption Momentum",
    definition: "Whether intended users are applying, sustaining and expanding the new ways of working in normal operations.",
    questions: [
      "How consistently are target users applying the intended new processes, tools or behaviors in normal work?",
      "How well are the new ways of working holding without repeated intervention or reversion to legacy practice?",
      "How consistently is meaningful adoption evidence reviewed and used to guide decisions?",
      "How capable are frontline managers of coaching and reinforcing the expected new behaviors?",
      "To what extent is adoption expanding or deepening across the intended population rather than plateauing or receding?"
    ]
  }
];

const round = (n, digits = 2) => Number(n.toFixed(digits));
const avg = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

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
  if (score >= 0.8) return { key: "high", label: "High" };
  if (score >= 0.6) return { key: "moderate", label: "Moderate" };
  return { key: "limited", label: "Limited" };
}

export function calculateAssessment(answers, evidence) {
  const vectorResults = VECTORS.map(vector => {
    const raw = answers?.[vector.id] || [];
    const numeric = raw.filter(v => typeof v === "number" && v >= 1 && v <= 5);
    const explicitUnknowns = raw.filter(v => v === "unknown").length;
    const unanswered = Math.max(0, vector.questions.length - raw.filter(v => v !== undefined && v !== null).length);
    const knownCount = numeric.length;
    const score = knownCount >= 3 ? avg(numeric) : null;
    const coverage = knownCount / vector.questions.length;
    const evidenceOption = EVIDENCE_OPTIONS.find(o => o.value === evidence?.[vector.id]) || null;
    const visibility = evidenceOption ? coverage * evidenceOption.factor : null;

    return {
      id: vector.id,
      name: vector.name,
      short: vector.short,
      score: score == null ? null : round(score),
      knownCount,
      unknownCount: explicitUnknowns,
      unanswered,
      coverage: round(coverage, 3),
      evidence: evidenceOption?.value || null,
      visibility: visibility == null ? null : round(visibility, 3),
      status: classifyScore(score)
    };
  });

  const allVectorsScorable = vectorResults.every(v => v.score != null);
  const allEvidenceStated = vectorResults.every(v => v.visibility != null);
  const overallScore = allVectorsScorable ? avg(vectorResults.map(v => v.score)) : null;
  const visibilityScore = allEvidenceStated ? avg(vectorResults.map(v => v.visibility)) : null;
  const scorable = vectorResults.filter(v => v.score != null);
  const strongest = scorable.length ? [...scorable].sort((a,b) => b.score - a.score)[0] : null;
  const weakest = scorable.length ? [...scorable].sort((a,b) => a.score - b.score)[0] : null;
  const spread = strongest && weakest ? strongest.score - weakest.score : null;
  const unknownCount = vectorResults.reduce((s, v) => s + v.unknownCount, 0);

  const flags = [];
  if (weakest && weakest.score < 2.5) flags.push({ key: "weak-vector", label: "Critical weak point", detail: `${weakest.short} is below 2.50.` });
  if (spread != null && spread >= 1.25) flags.push({ key: "imbalance", label: "Structural imbalance", detail: `The gap between strongest and weakest vectors is ${round(spread)} points.` });
  if (visibilityScore != null && visibilityScore < 0.6) flags.push({ key: "low-visibility", label: "Limited visibility", detail: "Confidence in the apparent stability condition should remain limited." });

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
    unknownCount,
    complete: allVectorsScorable && allEvidenceStated,
    flags
  };
}

function vectorMap(result) {
  return Object.fromEntries((result?.vectors || []).map(v => [v.id, v]));
}

export function calculateVolatility(current, previous, previousPrevious = null) {
  if (!current?.complete || !previous?.complete) {
    return { available: false, label: "No prior snapshot", key: "none", deltas: [] };
  }

  const c = vectorMap(current);
  const p = vectorMap(previous);
  const pp = previousPrevious?.complete ? vectorMap(previousPrevious) : null;
  const deltas = VECTORS.map(v => ({
    id: v.id,
    short: v.short,
    delta: round(c[v.id].score - p[v.id].score)
  }));

  const absMean = avg(deltas.map(d => Math.abs(d.delta)));
  const materialMoves = deltas.filter(d => Math.abs(d.delta) >= 0.4).length;
  const materialDrops = deltas.filter(d => d.delta <= -0.4).length;
  const severeDrops = deltas.filter(d => d.delta <= -0.75).length;
  const maxDrop = Math.min(...deltas.map(d => d.delta));

  const currScores = VECTORS.map(v => c[v.id].score);
  const prevScores = VECTORS.map(v => p[v.id].score);
  const stdev = vals => {
    const m = avg(vals);
    return Math.sqrt(avg(vals.map(x => (x - m) ** 2)));
  };
  const dispersionChange = stdev(currScores) - stdev(prevScores);

  let acceleratingVectors = 0;
  if (pp) {
    for (const v of VECTORS) {
      const priorDelta = p[v.id].score - pp[v.id].score;
      const currentDelta = c[v.id].score - p[v.id].score;
      if (currentDelta < 0 && (priorDelta - currentDelta) >= 0.25) acceleratingVectors += 1;
    }
  }

  let key = "low";
  if (materialMoves >= 1 || absMean >= 0.25) key = "moderate";
  if (materialMoves >= 3 || severeDrops >= 1 || absMean >= 0.45 || dispersionChange >= 0.3) key = "elevated";
  if (materialMoves >= 4 || severeDrops >= 2 || maxDrop <= -1.25 || absMean >= 0.65) key = "high";
  if (acceleratingVectors >= 2 && key === "moderate") key = "elevated";
  if (acceleratingVectors >= 3) key = "high";

  const labels = { low: "Low", moderate: "Moderate", elevated: "Elevated", high: "High" };
  const largestDrop = [...deltas].sort((a,b) => a.delta - b.delta)[0];
  const largestMove = [...deltas].sort((a,b) => Math.abs(b.delta) - Math.abs(a.delta))[0];

  return {
    available: true,
    key,
    label: labels[key],
    deltas,
    meanAbsoluteMovement: round(absMean),
    materialMoves,
    materialDrops,
    severeDrops,
    dispersionChange: round(dispersionChange),
    acceleratingVectors,
    largestDrop,
    largestMove
  };
}

export function comparePerspectives(results) {
  const valid = (results || []).filter(r => r?.complete);
  if (valid.length < 2) return { available: false, count: valid.length };

  const vectorGaps = VECTORS.map(v => {
    const scores = valid.map(r => vectorMap(r)[v.id].score);
    return { id: v.id, short: v.short, min: Math.min(...scores), max: Math.max(...scores), gap: round(Math.max(...scores) - Math.min(...scores)) };
  });
  const overallScores = valid.map(r => r.overallScore);
  const overallGap = round(Math.max(...overallScores) - Math.min(...overallScores));
  const largest = [...vectorGaps].sort((a,b) => b.gap - a.gap)[0];
  const key = largest.gap >= 1.25 || overallGap >= 1.0 ? "high" : largest.gap >= 0.75 || overallGap >= 0.6 ? "material" : "contained";
  const labels = { contained: "Contained", material: "Material", high: "High" };
  return { available: true, count: valid.length, overallGap, vectorGaps, largestGap: largest, key, label: labels[key] };
}

const PATTERNS = [
  {
    id: "execution-overload", priority: 95, title: "Execution Overload",
    when: ({v}) => v.alignment.score >= 3.5 && v.leadership.score >= 3.5 && v.capacity.score < 3.0,
    interpretation: "Commitment and strategic direction are stronger than the capacity available to carry them. Progress may be relying on overload rather than durable execution capacity.",
    question: "What work is currently being sustained through exceptional effort rather than normal operating capacity?"
  },
  {
    id: "adoption-stall", priority: 90, title: "Adoption Stall",
    when: ({v}) => v.delivery.score >= 3.5 && v.capacity.score >= 3.2 && v.adoption.score < 3.0,
    interpretation: "The initiative appears capable of being delivered, but the intended change is not becoming embedded in operating behavior.",
    question: "What is preventing delivered capability from becoming normal operating behavior?"
  },
  {
    id: "political-drag", priority: 88, title: "Political Drag",
    when: ({v}) => v.alignment.score >= 3.5 && v.friction.score < 3.0,
    interpretation: "Formal strategic alignment coexists with unresolved stakeholder or power friction. Agreement at the top may not describe the operating reality below it.",
    question: "Who loses influence, control, status or convenience if this initiative succeeds?"
  },
  {
    id: "brittle-momentum", priority: 87, title: "Brittle Momentum",
    when: ({v}) => v.adoption.score >= 3.5 && (v.delivery.score < 3.0 || v.capacity.score < 3.0),
    interpretation: "Adoption is ahead of one or more structures required to sustain it. Current momentum may be vulnerable to delivery or capacity shocks.",
    question: "Which part of current adoption would be hardest to sustain if additional support disappeared tomorrow?"
  },
  {
    id: "sponsor-execution-gap", priority: 84, title: "Sponsor–Execution Gap",
    when: ({v}) => v.leadership.score >= 3.8 && (v.delivery.score < 3.0 || v.capacity.score < 3.0),
    interpretation: "Leadership reinforcement is strong, but execution conditions remain weak. Visible sponsorship is not translating cleanly into delivery conditions.",
    question: "Which constraints remain unresolved despite visible leadership support?"
  },
  {
    id: "strategic-drift", priority: 82, title: "Strategic Drift",
    when: ({v}) => v.alignment.score < 3.0,
    interpretation: "The initiative’s purpose, priorities or scope no longer appear sufficiently coherent. Delivery activity may continue while strategic integrity weakens.",
    question: "Which recent decision most clearly changed what this initiative is actually trying to accomplish?"
  },
  {
    id: "momentum-without-reinforcement", priority: 78, title: "Momentum Without Reinforcement",
    when: ({v}) => v.adoption.score >= 3.5 && v.leadership.score < 3.0,
    interpretation: "Operating adoption is stronger than leadership reinforcement. Momentum may be locally generated rather than institutionally protected.",
    question: "What happens to current adoption if local champions stop carrying the initiative?"
  },
  {
    id: "designed-but-unsupported", priority: 76, title: "Designed but Unsupported",
    when: ({v}) => v.delivery.score >= 3.5 && v.capacity.score < 3.0,
    interpretation: "The delivery design is stronger than the capacity available to execute it. The plan may be sound on paper while remaining under-resourced in practice.",
    question: "Which delivery assumption depends on capacity that the organization does not actually have?"
  },
  {
    id: "adoption-without-proof", priority: 74, title: "Adoption Without Proof",
    when: ({v}) => v.adoption.score >= 3.5 && v.adoption.visibility < 0.6,
    interpretation: "Adoption appears healthy, but the evidence supporting that conclusion is limited. Confidence should remain lower than the score alone suggests.",
    question: "What observable evidence would prove that adoption exists outside the program team’s field of view?"
  },
  {
    id: "blind-stability", priority: 73, title: "Blind Stability",
    when: ({result}) => result.overallScore >= 3.5 && result.visibilityScore < 0.6,
    interpretation: "The initiative appears comparatively stable, but the evidence base is too limited to support high confidence in that conclusion.",
    question: "Which apparent strength is supported least by direct evidence?"
  },
  {
    id: "uneven-system", priority: 70, title: "Uneven System",
    when: ({result}) => result.spread >= 1.25,
    interpretation: "The initiative is structurally uneven. Strong vectors are masking significantly weaker conditions elsewhere in the system.",
    question: "Which strong area is currently compensating for the weakest one, and how long can that compensation continue?"
  },
  {
    id: "systemic-pressure", priority: 92, title: "Systemic Pressure",
    when: ({result}) => result.vectors.filter(x => x.score < 3.25).length >= 4,
    interpretation: "Pressure is not isolated to one weak point. Multiple parts of the initiative are operating below a comfortable stability range at the same time.",
    question: "If only one source of pressure could be reduced in the next 30 days, which one would release the most strain elsewhere?"
  },
  {
    id: "emerging-deterioration", priority: 96, title: "Emerging Deterioration",
    when: ({result, volatility}) => result.overallScore >= 3.5 && volatility?.available && ["elevated","high"].includes(volatility.key) && volatility.materialDrops >= 2,
    interpretation: "The current overall condition still appears comparatively healthy, but multiple vectors are deteriorating quickly enough to warrant attention before the composite score catches up.",
    question: "What changed between the last two snapshots that could explain simultaneous deterioration across several vectors?"
  },
  {
    id: "perspective-fracture", priority: 98, title: "Perspective Fracture",
    when: ({perspective}) => perspective?.available && (perspective.largestGap.gap >= 1.0 || perspective.overallGap >= 0.75),
    interpretation: "Different organizational vantage points are producing materially different readings of the same initiative. The divergence itself is an exposure signal.",
    question: "What does the group closest to the weakest operating reality see that other vantage points may not?"
  }
];

export function diagnose(result, volatility = null, perspective = null) {
  if (!result?.complete) return [];
  const v = vectorMap(result);
  return PATTERNS
    .filter(p => p.when({ result, v, volatility, perspective }))
    .sort((a,b) => b.priority - a.priority)
    .map(({ when, priority, ...rest }) => rest);
}

export function buildObservations(result, volatility = null, patterns = [], perspective = null) {
  if (!result?.complete) return [];
  const observations = [];

  observations.push(`The initiative currently sits in the ${result.status.label} range at ${result.overallScore.toFixed(2)} / 5. ${result.strongest.short} is the strongest vector; ${result.weakest.short} is the weakest.`);

  if (volatility?.available) {
    if (volatility.largestDrop?.delta < 0) {
      observations.push(`Volatility is ${volatility.label.toLowerCase()}. The largest deterioration since the previous snapshot is ${volatility.largestDrop.short} at ${volatility.largestDrop.delta.toFixed(2)} points.`);
    } else {
      observations.push(`Volatility is ${volatility.label.toLowerCase()}. No vector deteriorated relative to the previous snapshot.`);
    }
  } else {
    observations.push("Volatility is not yet available. Save another snapshot of the same perspective to establish movement over time.");
  }

  observations.push(`Visibility is ${result.visibility.label.toLowerCase()}. ${result.unknownCount} of 30 conditions were marked unknown; evidence strength is assessed separately from stability.`);

  if (perspective?.available) {
    observations.push(`Perspective divergence is ${perspective.label.toLowerCase()}. The largest gap is ${perspective.largestGap.short} at ${perspective.largestGap.gap.toFixed(2)} points across ${perspective.count} perspectives.`);
  }

  if (patterns.length) observations.push(patterns[0].interpretation);
  return observations.slice(0, 4);
}

export function questionsWorthExamining(result, patterns = []) {
  const unique = [];
  for (const pattern of patterns) {
    if (!unique.includes(pattern.question)) unique.push(pattern.question);
    if (unique.length === 3) return unique;
  }

  const fallbacks = {
    alignment: "Which recent decision most threatens the coherence of the initiative’s original purpose?",
    leadership: "Where is leadership behavior least consistent with the priority leaders say this initiative has?",
    friction: "Which stakeholder tension is most likely to remain invisible until it begins affecting delivery?",
    capacity: "Which workstream is most dependent on unsustainable effort or scarce capability?",
    delivery: "Which dependency or assumption would create the largest disruption if it failed now?",
    adoption: "Where is apparent adoption most likely to be compliance, work-around behavior or temporary momentum?"
  };
  if (result?.weakest) unique.push(fallbacks[result.weakest.id]);
  unique.push("What would have to become true in the next 30 days for the weakest part of this initiative to become materially more stable?");
  unique.push("Which current conclusion about this initiative would be most damaging if it turned out to be wrong?");
  return [...new Set(unique)].slice(0,3);
}

export function sanitizeTelemetry(result, context = {}) {
  if (!result?.complete) return null;
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
