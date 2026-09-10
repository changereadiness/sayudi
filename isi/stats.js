import { ISI_VERSION, VECTORS } from "./engine.js";
const target = document.querySelector("#stats");
const esc = value => String(value ?? "").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
try {
  const response = await fetch(`/api/isi/stats?version=${encodeURIComponent(ISI_VERSION)}`, { credentials:"omit", cache:"no-store" });
  if (!response.ok) throw new Error("Stats endpoint unavailable");
  const s = await response.json();
  if (!s.completed) {
    target.innerHTML = `<p>No completed ISI ${esc(ISI_VERSION)} assessments have been aggregated yet.</p>`;
  } else {
    const vectorRows = VECTORS.map(v=>`<tr><td>${esc(v.short)}</td><td>${Number(s.averages[v.id]).toFixed(2)}</td></tr>`).join("");
    const monthRows = (s.months||[]).map(m=>`<tr><td>${esc(m.month)}</td><td>${Number(m.completed).toLocaleString()}</td><td>${Number(m.averages.overall).toFixed(2)}</td></tr>`).join("");
    target.innerHTML = `<div class="stats-kpis"><div><span>Completed assessments</span><strong>${Number(s.completed).toLocaleString()}</strong></div><div><span>Average ISI</span><strong>${Number(s.averages.overall).toFixed(2)}</strong></div><div><span>Average visibility</span><strong>${Math.round(Number(s.averages.visibility)*100)}%</strong></div></div><section class="analysis-section"><div class="eyebrow">VECTOR AVERAGES</div><table><thead><tr><th>Vector</th><th>Average</th></tr></thead><tbody>${vectorRows}</tbody></table></section><section class="analysis-section"><div class="eyebrow">MONTHLY VOLUME · SAME VERSION</div><table><thead><tr><th>Month</th><th>Completed</th><th>Average ISI</th></tr></thead><tbody>${monthRows || '<tr><td colspan="3">No monthly data.</td></tr>'}</tbody></table></section>`;
  }
} catch (error) {
  target.innerHTML = `<p>Aggregate statistics are unavailable. The assessment itself does not depend on this endpoint.</p>`;
}
