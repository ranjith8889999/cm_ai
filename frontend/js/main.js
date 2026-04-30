/* ════════════════════════════════════════════════════
   TELANGANA AI GOVERNANCE – MAIN JAVASCRIPT
   ════════════════════════════════════════════════════ */

const API = "http://localhost:5000/api";

/* ─── App State ─────────────────────────────────────── */
let state = {
  currentTab: "dashboard",
  newsData: [],
  districtData: [],
  pollsData: [],
  alertsData: [],
  impactData: [],
  memoryData: [],
  govSuggestions: [],
  currentNewsFilter: "all",
  isSpeaking: false,
  sidebarCollapsed: false,
  charts: {},
  recognition: null,
  isRecording: false,
};

/* ─── Init ───────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  initParticles();
  initLoading();
});

function initLoading() {
  const fill = document.getElementById("loadFill");
  let pct = 0;
  const iv = setInterval(() => {
    pct += Math.random() * 18 + 5;
    if (pct >= 100) { pct = 100; clearInterval(iv); }
    fill.style.width = pct + "%";
    if (pct === 100) setTimeout(startApp, 400);
  }, 180);
}

async function startApp() {
  document.getElementById("loadingScreen").classList.add("fade-out");
  setTimeout(() => (document.getElementById("loadingScreen").style.display = "none"), 600);
  initClock();
  setGreeting();
  setupNavigation();
  setupNewsFilter();
  await loadAllData();
  initAlertBanner();
  setupVoiceRecognition();
  startAutoRefresh();
}

/* ─── Clock ──────────────────────────────────────────── */
function initClock() {
  const update = () => {
    const now = new Date();
    const t = now.toLocaleTimeString("te-IN", { hour: "2-digit", minute: "2-digit" });
    const el = document.getElementById("topbarTime");
    if (el) el.textContent = t;
    const sd = document.getElementById("sidebarDate");
    if (sd) sd.textContent = now.toLocaleDateString("te-IN", { weekday: "short", day: "numeric", month: "short" });
  };
  update();
  setInterval(update, 30000);
}

/* ─── Greeting ───────────────────────────────────────── */
function setGreeting() {
  const h = new Date().getHours();
  let label = h < 12 ? "శుభోదయం ☀️" : h < 17 ? "శుభ మధ్యాహ్నం 🌤️" : "శుభ సాయంత్రం 🌙";
  document.getElementById("greetingLabel").textContent = label;
  const opts = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  document.getElementById("greetingDate").textContent = new Date().toLocaleDateString("te-IN", opts);
}

/* ─── Navigation ─────────────────────────────────────── */
function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => switchTab(item.dataset.tab));
  });
}

function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.tab === tab));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + tab));
  const titles = {
    dashboard: ["డాష్‌బోర్డ్", "తెలంగాణ రాష్ట్ర గవర్నెన్స్ అవలోకనం"],
    news: ["వార్తలు", "AI వార్తా విశ్లేషణ"],
    polls: ["ప్రజా అభిప్రాయం", "జిల్లాల వారీ సెంటిమెంట్"],
    governance: ["AI సూచనలు", "స్మార్ట్ గవర్నెన్స్ సూచనలు"],
    map: ["జిల్లా మ్యాప్", "తెలంగాణ హీట్‌మ్యాప్"],
    alerts: ["రెడ్ అలర్ట్లు", "తక్షణ దృష్టి అవసరమయ్యే సమస్యలు"],
    impact: ["ప్రభావ ట్రాకర్", "ముందు vs తర్వాత విశ్లేషణ"],
    memory: ["జ్ఞాపక వ్యవస్థ", "పెండింగ్ సమస్యలు & ఫాలో-అప్"],
    voice: ["వాయిస్ AI", "తెలుగులో మాట్లాడండి"],
    election: ["ఎన్నికల ఫలితాలు 2023", "తెలంగాణ అసెంబ్లీ ఎన్నికలు – పార్టీల విజయాలు & సమస్యలు"],
  };
  const [title, sub] = titles[tab] || ["", ""];
  document.getElementById("pageTitle").textContent = title;
  document.getElementById("pageSubtitle").textContent = sub;

  // Lazy load tab data
  if (tab === "governance" && state.govSuggestions.length === 0) loadGovernanceSuggestions();
  if (tab === "map") renderDistrictMap();
  if (tab === "polls") animatePollBars();
  if (tab === "election") renderElectionResults();
}

function toggleSidebar() {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  document.getElementById("sidebar").classList.toggle("collapsed", state.sidebarCollapsed);
  document.getElementById("mainContent").classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
}

/* ─── Stat Navigation → AI Analysis ─────────────────── */
// Map from tab → API context type and data getter
const STAT_TAB_MAP = {
  alerts:     { type: "alerts",     getData: () => state.alertsData },
  news:       { type: "news",       getData: () => state.newsData },
  map:        { type: "districts",  getData: () => state.districtData },
  governance: { type: "governance", getData: () => state.govSuggestions.length ? state.govSuggestions : getDemoSuggestions() },
};

function statNavTo(tab) {
  switchTab(tab);
  // Slight delay so the tab is visible before we show the panel
  setTimeout(() => loadTabAnalysis(tab), 300);
}

async function loadTabAnalysis(tab) {
  const cfg = STAT_TAB_MAP[tab];
  if (!cfg) return;

  const panelKey = tab === "map" ? "map" : tab;
  const panel   = document.getElementById(`analysisPanel-${panelKey}`);
  const loader  = document.getElementById(`analysisLoader-${panelKey}`);
  const body    = document.getElementById(`analysisBody-${panelKey}`);
  if (!panel) return;

  panel.style.display = "block";
  loader.style.display = "flex";
  body.style.display = "none";
  panel.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const res = await fetch(`${API}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: cfg.type, items: cfg.getData() }),
    });
    const data = await res.json();
    renderAnalysisPanel(panelKey, data);
  } catch (e) {
    renderAnalysisPanel(panelKey, {
      analysis_telugu: "విశ్లేషణ అందుబాటులో లేదు. AI సర్వర్‌తో కనెక్షన్ తనిఖీ చేయండి.",
      resolution_steps: ["నెట్‌వర్క్ కనెక్షన్ తనిఖీ చేయండి", "GROQ_API_KEY సెట్ అయిందో చూడండి", "తర్వాత మళ్ళీ ప్రయత్నించండి"],
    });
  }
}

function renderAnalysisPanel(tabKey, data) {
  const loader  = document.getElementById(`analysisLoader-${tabKey}`);
  const body    = document.getElementById(`analysisBody-${tabKey}`);
  const textEl  = document.getElementById(`analysisText-${tabKey}`);
  const stepsEl = document.getElementById(`analysisSteps-${tabKey}`);

  if (loader) loader.style.display = "none";
  if (!body || !textEl || !stepsEl) return;

  // Store for save-to-tracker feature
  body._analysisData = data;
  body._tabKey = tabKey;

  textEl.textContent = data.analysis_telugu || "";

  const steps = data.resolution_steps || [];
  stepsEl.innerHTML = steps
    .map((step, i) => `
      <div class="aap-step" id="aap-step-${tabKey}-${i}">
        <span class="aap-step-num">${i + 1}</span>
        <span class="aap-step-text">${step}</span>
        <button class="aap-save-step" title="Action Tracker కు పంపండి"
          onclick="saveStepToTracker('${tabKey}', ${i}, this)">
          <i class="fas fa-bookmark"></i>
        </button>
      </div>`)
    .join("");

  // Save-all button (replace if already exists)
  const existing = body.querySelector(".aap-save-all-btn");
  if (existing) existing.remove();
  const saveAllBtn = document.createElement("button");
  saveAllBtn.className = "btn-brief small aap-save-all-btn";
  saveAllBtn.innerHTML = `<i class="fas fa-list-check"></i> అన్నీ Action Tracker కు పంపండి`;
  saveAllBtn.onclick = () => saveAllStepsToTracker(tabKey, steps);
  body.querySelector(".aap-speak").insertAdjacentElement("beforebegin", saveAllBtn);

  body.style.display = "block";
}

async function saveStepToTracker(tabKey, stepIdx, btn) {
  const body = document.getElementById(`analysisBody-${tabKey}`);
  const data = body?._analysisData;
  if (!data) return;
  const step = data.resolution_steps[stepIdx];
  const typeLabels = { alerts: "అలర్ట్ పరిష్కారం", news: "వార్తా చర్య", map: "జిల్లా చర్య", governance: "పాలన చర్య" };
  const item = {
    title: step.length > 50 ? step.slice(0, 50) + "…" : step,
    district: "",
    priority: "high",
    description: `AI విశ్లేషణ నుండి: ${step}\n\nసందర్భం: ${data.analysis_telugu?.slice(0, 120) || ""}`,
    follow_up_days: 7,
    reminder: `AI సూచించిన చర్య: ${step.slice(0, 60)}`,
    tags: ["ai-resolution", typeLabels[tabKey] || tabKey],
  };
  try {
    const r = await fetch(`${API}/memory`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
    const d = await r.json();
    state.memoryData.unshift(d.item);
  } catch {
    item.id = Date.now(); item.date = new Date().toISOString().split("T")[0]; item.status = "open";
    state.memoryData.unshift(item);
  }
  btn.innerHTML = `<i class="fas fa-check"></i>`;
  btn.classList.add("saved");
  btn.disabled = true;
  showToast("✅ Action Tracker కు పంపబడింది", "success");
}

async function saveAllStepsToTracker(tabKey, steps) {
  const body = document.getElementById(`analysisBody-${tabKey}`);
  const data = body?._analysisData;
  if (!data || !steps.length) return;
  const typeLabels = { alerts: "అలర్ట్ పరిష్కారం", news: "వార్తా చర్య", map: "జిల్లా చర్య", governance: "పాలన చర్య" };
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const item = {
      title: step.length > 50 ? step.slice(0, 50) + "…" : step,
      district: "",
      priority: "high",
      description: `AI విశ్లేషణ నుండి: ${step}`,
      follow_up_days: 7,
      reminder: `AI సూచించిన చర్య: ${step.slice(0, 60)}`,
      tags: ["ai-resolution", typeLabels[tabKey] || tabKey],
    };
    try {
      const r = await fetch(`${API}/memory`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
      const d = await r.json();
      state.memoryData.unshift(d.item);
    } catch {
      item.id = Date.now() + i; item.date = new Date().toISOString().split("T")[0]; item.status = "open";
      state.memoryData.unshift(item);
    }
    // Mark individual buttons as saved
    const btn = document.getElementById(`aap-step-${tabKey}-${i}`)?.querySelector(".aap-save-step");
    if (btn) { btn.innerHTML = `<i class="fas fa-check"></i>`; btn.classList.add("saved"); btn.disabled = true; }
  }
  showToast(`✅ ${steps.length} చర్యలు Action Tracker కు పంపబడ్డాయి`, "success");
}

function closeAnalysisPanel(tabKey) {
  const panel = document.getElementById(`analysisPanel-${tabKey}`);
  if (panel) panel.style.display = "none";
}

function speakAnalysis(tabKey) {
  const textEl  = document.getElementById(`analysisText-${tabKey}`);
  const stepsEl = document.getElementById(`analysisSteps-${tabKey}`);
  if (!textEl) return;
  const stepsText = stepsEl ? stepsEl.innerText.replace(/\n/g, ". ") : "";
  speakText(`విశ్లేషణ: ${textEl.textContent}. పరిష్కార దశలు: ${stepsText}`);
}


async function loadAllData() {
  try {
    const [news, districts, polls, alerts, impact, memory] = await Promise.all([
      fetchJSON("/news"),
      fetchJSON("/districts"),
      fetchJSON("/polls"),
      fetchJSON("/alerts"),
      fetchJSON("/impact"),
      fetchJSON("/memory"),
    ]);
    state.newsData = news;
    state.districtData = districts;
    state.pollsData = polls;
    state.alertsData = alerts;
    state.impactData = impact;
    state.memoryData = memory;

    renderDashboard();
    renderNews("all");
    renderPolls();
    renderAlerts();
    renderImpact();
    renderMemory();
    populateDistrictSelects();
  } catch (e) {
    console.error("Data load error:", e);
    showToast("ℹ️ Sample data youthundi. Backend start cheyyandi.", "info");
    loadMockFallback();
  }
}

async function fetchJSON(path) {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

function loadMockFallback() {
  // Already loaded from backend or using static files approach
  showToast("⚡ Offline mode లో నడుస్తోంది", "info");
}

/* ─── Auto-Refresh (every 4 hours) ──────────────────────── */
const AUTO_REFRESH_MS = 4 * 60 * 60 * 1000; // 4 hours

function startAutoRefresh() {
  // Schedule a full data reload every 4 hours
  setInterval(async () => {
    console.log("[AutoRefresh] Starting 4-hour content reload…");
    await loadAllData();
    // If the user is on the map tab, re-render it too
    if (state.currentTab === "map") renderDistrictMap();
    // Reset governance suggestions so they are re-fetched on next visit
    state.govSuggestions = [];
    showToast("🔄 కంటెంట్ అప్‌డేట్ అయింది (4 గంటల రిఫ్రెష్)", "success");
    console.log("[AutoRefresh] Reload complete at", new Date().toLocaleTimeString());
  }, AUTO_REFRESH_MS);

  // Poll the backend scheduler status every 15 minutes so the console stays informative
  setInterval(async () => {
    try {
      const res = await fetch(API + "/scheduler/status");
      if (res.ok) {
        const s = await res.json();
        console.log(
          `[Scheduler] Last backend refresh: ${s.last_refresh || "pending"} | Cycles: ${s.cycles_completed}`
        );
      }
    } catch (_) { /* silently ignore if offline */ }
  }, 15 * 60 * 1000); // every 15 min
}

/* ─── Manual Refresh Button ──────────────────────────────── */
async function manualRefresh() {
  const btn = document.getElementById("refreshBtn");
  if (!btn) return;

  // Show spinning state
  btn.classList.add("spinning");
  btn.querySelector("span").textContent = "లోడ్ అవుతోంది…";

  try {
    // Reload all data from backend
    await loadAllData();

    // Refresh current tab's dynamic content
    if (state.currentTab === "map") renderDistrictMap();
    if (state.currentTab === "governance") {
      state.govSuggestions = [];
      await loadGovernanceSuggestions();
    }

    showToast("✅ అన్ని డేటా అప్‌డేట్ అయింది!", "success");
  } catch (e) {
    console.error("Manual refresh failed:", e);
    showToast("⚠️ రిఫ్రెష్ విఫలమైంది. మళ్ళీ ప్రయత్నించండి.", "error");
  } finally {
    // Restore button
    btn.classList.remove("spinning");
    btn.querySelector("span").textContent = "రిఫ్రెష్";
  }
}

/* ─── Dashboard ──────────────────────────────────────── */
function renderDashboard() {
  renderDashNews();
  renderDashAlerts();
  renderDashMemory();
  renderDashAiPreview();
  renderMoodChart();
  renderTrendChart();
  updateDashStats();
}

function updateDashStats() {
  const pos = state.newsData.filter((n) => n.sentiment === "positive").length;
  const neg = state.newsData.filter((n) => n.sentiment === "negative").length;
  document.getElementById("gs-alerts").textContent = state.alertsData.filter((a) => a.type === "red").length;
  document.getElementById("gs-positive").textContent = pos;
  document.getElementById("gs-suggestions").textContent = state.govSuggestions.length || 3;
}

function renderDashNews() {
  const el = document.getElementById("dashNewsList");
  const items = state.newsData.slice(0, 5);
  el.innerHTML = items
    .map(
      (n) => `
    <div class="dash-news-item" onclick="switchTab('news')">
      <div class="dni-dot" style="background:${n.sentiment === "positive" ? "var(--success)" : "var(--danger)"}"></div>
      <div>
        <div class="dni-title">${n.title_telugu}</div>
        <div class="dni-cat">${catLabel(n.category)} • ${n.district}</div>
      </div>
    </div>`
    )
    .join("");
}

function renderDashAlerts() {
  const el = document.getElementById("dashAlertsList");
  el.innerHTML = state.alertsData
    .slice(0, 3)
    .map(
      (a) => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;margin-bottom:6px;background:rgba(244,67,54,0.05);border:1px solid rgba(244,67,54,0.1)">
      <span style="font-size:1.3rem">${a.icon}</span>
      <div style="flex:1">
        <div style="font-family:'Noto Sans Telugu';font-size:0.8rem;font-weight:600">${a.title_telugu}</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">${a.district}</div>
      </div>
      <span class="alert-severity sev-${a.severity}">${a.severity}</span>
    </div>`
    )
    .join("");
}

function renderDashMemory() {
  const open = state.memoryData.filter((m) => m.status === "open").slice(0, 3);
  const el = document.getElementById("dashMemoryList");
  el.innerHTML = open
    .map(
      (m) => `
    <div style="padding:8px 10px;border-radius:8px;margin-bottom:6px;background:rgba(255,167,38,0.05);border-left:2px solid var(--warning)">
      <div style="font-family:'Noto Sans Telugu';font-size:0.8rem;font-weight:600">${m.title}</div>
      <div style="font-size:0.7rem;color:var(--warning)">⏰ ${m.follow_up_days} రోజులు పెండింగ్</div>
    </div>`
    )
    .join("");
}

function renderDashAiPreview() {
  const el = document.getElementById("dashAiPreview");
  const suggestions = state.govSuggestions.length ? state.govSuggestions : getDemoSuggestions();
  if (!suggestions.length) return;
  const s = suggestions[0];
  el.innerHTML = `
    <div style="padding:12px;background:rgba(124,58,237,0.06);border-radius:10px">
      <div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:6px">సమస్య</div>
      <div style="font-family:'Noto Sans Telugu';font-size:0.85rem;color:var(--danger);margin-bottom:8px">${s.problem_telugu}</div>
      <div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:4px">AI సూచన</div>
      <div style="font-family:'Noto Sans Telugu';font-size:0.85rem;color:var(--success)">${s.suggestion_telugu}</div>
    </div>`;
}

/* ─── Mood Donut Chart ───────────────────────────────── */
function renderMoodChart() {
  const happy = state.districtData.filter((d) => d.sentiment === "positive").length;
  const neutral = state.districtData.filter((d) => d.sentiment === "neutral").length;
  const angry = state.districtData.filter((d) => d.sentiment === "negative").length;
  const ctx = document.getElementById("moodDonutChart");
  if (!ctx) return;
  if (state.charts.mood) state.charts.mood.destroy();
  state.charts.mood = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["సంతోషకరం", "సాధారణం", "ఆందోళన"],
      datasets: [{ data: [happy, neutral, angry], backgroundColor: ["#00e676", "#ffd700", "#f44336"], borderWidth: 0, hoverOffset: 8 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "65%",
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw} జిల్లాలు` } } },
      animation: { animateRotate: true, duration: 1000 },
    },
  });
  document.getElementById("moodLegend").innerHTML = [
    { l: "సంతోషకరం", c: "#00e676", v: happy },
    { l: "సాధారణం", c: "#ffd700", v: neutral },
    { l: "ఆందోళన", c: "#f44336", v: angry },
  ]
    .map((x) => `<div class="mood-leg-item"><div class="mood-leg-dot" style="background:${x.c}"></div>${x.l}: ${x.v}</div>`)
    .join("");
}

/* ─── Trend Line Chart ───────────────────────────────── */
function renderTrendChart() {
  const ctx = document.getElementById("trendLineChart");
  if (!ctx) return;
  const labels = ["7 రోజుల క్రితం", "6", "5", "4", "3", "2", "నేడు"];
  const data = [42, 44, 41, 47, 45, 48, 52];
  if (state.charts.trend) state.charts.trend.destroy();
  state.charts.trend = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "సెంటిమెంట్ స్కోర్",
        data,
        borderColor: "#e91e8c",
        backgroundColor: "rgba(233,30,140,0.1)",
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#e91e8c",
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#7986cb", font: { size: 10 } } },
        y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#7986cb", font: { size: 10 } }, min: 30, max: 70 },
      },
      animation: { duration: 1200 },
    },
  });
}

/* ─── News ───────────────────────────────────────────── */
function setupNewsFilter() {
  document.getElementById("newsFilter")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderNews(btn.dataset.cat);
  });
}

function renderNews(cat = "all") {
  state.currentNewsFilter = cat;
  const list = cat === "all" ? state.newsData : state.newsData.filter((n) => n.category === cat);
  const el = document.getElementById("newsList");
  if (!el) return;
  el.innerHTML = list.map((n) => newsCard(n)).join("");
  // Animate entrance
  el.querySelectorAll(".news-card").forEach((c, i) => {
    c.style.opacity = 0; c.style.transform = "translateY(20px)";
    setTimeout(() => { c.style.transition = "all 0.4s ease"; c.style.opacity = 1; c.style.transform = ""; }, i * 60);
  });
}

function newsCard(n) {
  return `
  <div class="news-card ${n.sentiment}" onclick="toggleNewsDetails(this)">
    <div class="news-card-header">
      <div class="news-sentiment-dot ${n.sentiment}"></div>
      <div class="news-title">${n.title_telugu}</div>
      <span class="news-category cat-${n.category}">${catLabel(n.category)}</span>
    </div>
    <p class="news-summary">${n.summary}</p>
    <div class="news-impact">💡 <strong>ప్రభావం:</strong> ${n.impact}</div>
    <div class="news-what-means">
      <div class="news-what-label">🎯 ఇది అంటే ఏమిటి?</div>
      ${n.what_this_means}
    </div>
    <div class="news-footer">
      <span class="news-meta">📍 ${n.district} • 📅 ${n.date}</span>
      <div class="news-actions">
        <button class="news-btn" onclick="speakNewsCard(event, '${escQ(n.summary)}')">🔊 వినండి</button>
        <button class="news-btn" onclick="aiSummarizeCard(event, '${escQ(n.title_telugu + " " + n.summary)}')">🤖 AI</button>
      </div>
    </div>
  </div>`;
}

function toggleNewsDetails(card) {
  card.querySelector(".news-what-means")?.classList.toggle("visible");
}

function speakNewsCard(e, text) {
  e.stopPropagation();
  speakText(text);
}

function aiSummarizeCard(e, text) {
  e.stopPropagation();
  summarizeText(text);
}

async function summarizeAllNews() {
  const panel = document.getElementById("newsSummaryPanel");
  const textEl = document.getElementById("newsSummaryText");
  panel.style.display = "block";
  textEl.textContent = "AI ఆలోచిస్తోంది...";
  const topNews = state.newsData.slice(0, 5).map((n) => n.title_telugu).join(". ");
  try {
    const r = await fetch(API + "/news/summarize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: topNews }) });
    const d = await r.json();
    textEl.textContent = d.summary || "సారాంశం అందుబాటులో లేదు.";
  } catch {
    textEl.textContent = "నేడు తెలంగాణలో అనేక ముఖ్యమైన పరిణామాలు జరిగాయి. మౌలిక సదుపాయాలు, ప్రజా ఫిర్యాదులు, ఆర్థిక వ్యవస్థలో మార్పులు ప్రజల దృష్టిని ఆకర్షిస్తున్నాయి.";
  }
}

async function summarizeText(text) {
  const panel = document.getElementById("newsSummaryPanel");
  const textEl = document.getElementById("newsSummaryText");
  panel.style.display = "block";
  textEl.textContent = "AI ఆలోచిస్తోంది...";
  try {
    const r = await fetch(API + "/news/summarize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    const d = await r.json();
    textEl.textContent = d.summary || text;
  } catch {
    textEl.textContent = text;
  }
}

function closeAiPanel(id) {
  document.getElementById(id).style.display = "none";
}

/* ─── Polls ──────────────────────────────────────────── */
function renderPolls() {
  const el = document.getElementById("pollsContainer");
  if (!el) return;
  el.innerHTML = state.pollsData.map((p) => pollCard(p)).join("");
  renderDistrictSentimentChart();
  renderWeekTrendChart();
}

function pollCard(p) {
  const trend = p.trend.change.startsWith("+") ? "trend-up" : p.trend.change.startsWith("-") ? "trend-down" : "trend-stable";
  const trendIcon = p.trend.change.startsWith("+") ? "📈" : p.trend.change.startsWith("-") ? "📉" : "➡️";
  return `
  <div class="poll-card glass-card">
    <div class="poll-question">${p.question}</div>
    ${p.options.map((o) => `
      <div class="poll-option">
        <div class="poll-option-label">
          <span>${o.label}</span>
          <strong>${o.percent}%</strong>
        </div>
        <div class="poll-bar-track">
          <div class="poll-bar-fill" style="background:${o.color};width:0%" data-width="${o.percent}%"></div>
        </div>
      </div>`).join("")}
    <div class="poll-footer">
      <span>🗳️ ${p.total_responses.toLocaleString()} ప్రతిస్పందనలు</span>
      <span class="trend-chip ${trend}">${trendIcon} 7 రోజుల్లో: ${p.trend.change}</span>
    </div>
  </div>`;
}

function animatePollBars() {
  setTimeout(() => {
    document.querySelectorAll(".poll-bar-fill").forEach((b) => {
      b.style.width = b.dataset.width;
    });
  }, 100);
}

function renderDistrictSentimentChart() {
  const ctx = document.getElementById("districtSentimentChart");
  if (!ctx) return;
  const top = [...state.districtData].sort((a, b) => b.score - a.score).slice(0, 8);
  if (state.charts.distSentiment) state.charts.distSentiment.destroy();
  state.charts.distSentiment = new Chart(ctx, {
    type: "bar",
    data: {
      labels: top.map((d) => d.name_telugu),
      datasets: [{
        label: "సెంటిమెంట్ స్కోర్",
        data: top.map((d) => d.score),
        backgroundColor: top.map((d) => d.score > 60 ? "rgba(0,230,118,0.7)" : d.score > 40 ? "rgba(255,215,0,0.7)" : "rgba(244,67,54,0.7)"),
        borderRadius: 6, borderSkipped: false,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#7986cb", font: { size: 9 } } },
        y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#7986cb" }, min: 0, max: 100 },
      },
    },
  });
}

function renderWeekTrendChart() {
  const ctx = document.getElementById("weekTrendChart");
  if (!ctx) return;
  if (state.charts.week) state.charts.week.destroy();
  state.charts.week = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["సోమ", "మంగళ", "బుధ", "గురు", "శుక్ర", "శని", "ఆది"],
      datasets: [
        { label: "సంతోషకరం", data: [10, 12, 11, 13, 12, 14, happy()], borderColor: "#00e676", tension: 0.4, fill: false, pointRadius: 3 },
        { label: "ఆందోళన", data: [8, 9, 10, 8, 9, 8, angry()], borderColor: "#f44336", tension: 0.4, fill: false, pointRadius: 3 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#7986cb", font: { size: 10 }, boxWidth: 12 } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#7986cb", font: { size: 9 } } },
        y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#7986cb" } },
      },
    },
  });
}

function happy() { return state.districtData.filter((d) => d.sentiment === "positive").length; }
function angry() { return state.districtData.filter((d) => d.sentiment === "negative").length; }

/* ─── Governance Suggestions ─────────────────────────── */
async function loadGovernanceSuggestions() {
  const loader = document.getElementById("govLoader");
  const container = document.getElementById("govSuggestions");
  if (loader) loader.style.display = "block";
  if (container) container.innerHTML = "";
  const district = document.getElementById("govDistrictSelect")?.value || "";
  try {
    const r = await fetch(`${API}/governance/suggestions${district ? "?district=" + encodeURIComponent(district) : ""}`);
    const data = await r.json();
    state.govSuggestions = data.length ? data : getDemoSuggestions();
  } catch {
    state.govSuggestions = getDemoSuggestions();
  }
  if (loader) loader.style.display = "none";
  renderGovSuggestions();
  renderDashAiPreview();
  updateDashStats();
}

function getDemoSuggestions() {
  return [
    {
      problem_telugu: "నిజామాబాద్ జిల్లాలో తీవ్రమైన నీటి కొరత",
      impact_telugu: "50,000 కుటుంబాలు ప్రభావితం, వేసవిలో మరింత దిగజారుతుంది",
      suggestion_telugu: "20 వాటర్ ట్యాంకర్లు వెంటనే పంపాలి, దీర్ఘకాలిక పైప్‌లైన్ ప్రాజెక్టు చేపట్టాలి",
      priority: "high",
      action_steps: ["20 ట్యాంకర్లు 48 గంటల్లో పంపాలి", "₹50 కోట్ల పైప్‌లైన్ ప్రాజెక్టు ప్రారంభించాలి"],
    },
    {
      problem_telugu: "వరంగల్‌లో రైతుల పంట బీమా పెండింగ్",
      impact_telugu: "2 లక్షల రైతులకు ₹800 కోట్ల పరిహారం ఆగిపోయింది",
      suggestion_telugu: "వ్యవసాయ శాఖ సమావేశం నిర్వహించి 15 రోజుల్లో పరిహారం చెల్లించాలి",
      priority: "high",
      action_steps: ["వ్యవసాయ కమిషనర్‌తో అత్యవసర సమావేశం", "డిజిటల్ పేమెంట్ ద్వారా నేరుగా రైతుల ఖాతాలకు బదిలీ"],
    },
    {
      problem_telugu: "ఆదిలాబాద్ గిరిజన ఆసుపత్రుల్లో వైద్యుల కొరత",
      impact_telugu: "1 లక్ష గిరిజన ప్రజలకు వైద్య సేవలు అందడం లేదు",
      suggestion_telugu: "50 వైద్యులను తక్షణం నియమించాలి, టెలీమెడిసిన్ సేవలు ప్రారంభించాలి",
      priority: "high",
      action_steps: ["NHM ద్వారా 50 పోస్టులకు వేగవంతమైన నియామకం", "ప్రతి PHCకి టెలీమెడిసిన్ కిట్ అందించాలి"],
    },
  ];
}

function renderGovSuggestions() {
  const el = document.getElementById("govSuggestions");
  if (!el) return;
  el.innerHTML = state.govSuggestions.map((s, i) => govCard(s, i)).join("");
  el.querySelectorAll(".gov-card").forEach((c, i) => {
    c.style.opacity = 0; c.style.transform = "translateY(20px)";
    setTimeout(() => { c.style.transition = "all 0.4s ease"; c.style.opacity = 1; c.style.transform = ""; }, i * 100);
  });
}

function govCard(s, i) {
  const steps = (s.action_steps || []).map((step, j) =>
    `<div class="gov-step"><span class="gov-step-num">${j + 1}</span>${step}</div>`
  ).join("");
  return `
  <div class="gov-card ${s.priority || 'medium'}">
    <span class="gov-priority ${s.priority || 'medium'}">
      ${s.priority === "high" ? "🔴" : s.priority === "medium" ? "🟡" : "🟢"} ${priLabel(s.priority)}
    </span>
    <div class="gov-section">
      <div class="gov-section-label">⚠️ సమస్య</div>
      <div class="gov-section-text gov-problem">${s.problem_telugu}</div>
    </div>
    <div class="gov-section">
      <div class="gov-section-label">📊 ప్రభావం</div>
      <div class="gov-section-text gov-impact">${s.impact_telugu}</div>
    </div>
    <div class="gov-section">
      <div class="gov-section-label">💡 AI సూచన</div>
      <div class="gov-section-text gov-suggestion">${s.suggestion_telugu}</div>
    </div>
    ${steps ? `<div class="gov-steps"><div class="gov-section-label">📋 చర్యలు</div>${steps}</div>` : ""}
    <button class="btn-speak" onclick="speakText('సమస్య: ${escQ(s.problem_telugu)}. AI సూచన: ${escQ(s.suggestion_telugu)}')">
      <i class="fas fa-volume-high"></i> వినండి
    </button>
  </div>`;
}

/* ─── District Map ───────────────────────────────────── */
function renderDistrictMap() {
  const g = document.getElementById("districtMarkers");
  if (!g || !state.districtData.length) return;
  g.innerHTML = "";
  state.districtData.forEach((d) => {
    const x = (d.x / 100) * 500;
    const y = (d.y / 100) * 580;
    const color = d.score > 60 ? "#00e676" : d.score > 40 ? "#ffd700" : "#f44336";
    const radius = Math.max(8, Math.min(18, d.population / 200000));
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "district-circle");
    group.setAttribute("transform", `translate(${x}, ${y})`);
    group.innerHTML = `
      <circle cx="0" cy="0" r="${radius}" fill="${color}" opacity="0.8" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
      <circle cx="0" cy="0" r="${radius + 4}" fill="none" stroke="${color}" opacity="0.3" stroke-width="1">
        <animate attributeName="r" values="${radius + 2};${radius + 10};${radius + 2}" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite"/>
      </circle>
      <text x="0" y="${radius + 10}" text-anchor="middle" font-size="7" fill="rgba(255,255,255,0.7)" font-family="'Noto Sans Telugu'">${d.name_telugu.slice(0, 3)}</text>`;
    group.addEventListener("click", () => showDistrictInfo(d));
    g.appendChild(group);
  });

  document.querySelectorAll(".map-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".map-filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

async function showDistrictInfo(d) {
  const panel = document.getElementById("mapDistrictInfo");
  panel.innerHTML = `
    <div class="dist-info-name">${d.name_telugu}</div>
    <div class="dist-info-score" style="color:${d.score > 60 ? "var(--success)" : d.score > 40 ? "var(--warning)" : "var(--danger)"}">${d.score}</div>
    <div class="dist-info-mood">మూడ్: ${moodEmoji(d.sentiment)} ${d.mood}</div>
    <div class="dist-info-issues">
      <strong style="font-family:'Noto Sans Telugu';font-size:0.78rem">సమస్యలు:</strong><br/>
      ${d.issues.map((i) => `<span class="dist-issue-tag">${i}</span>`).join("")}
    </div>
    <div style="margin-top:10px;font-size:0.72rem;color:var(--text-muted);display:flex;gap:10px">
      <span>✅ ${d.positive_news} మంచి</span>
      <span>❌ ${d.negative_news} చెడు</span>
    </div>
    <div class="dist-ai-summary" id="distAiSummary">
      <i class="fas fa-spinner fa-spin"></i> AI సారాంశం లోడ్ అవుతోంది...
    </div>`;
  speakText(`${d.name_telugu} జిల్లా సెంటిమెంట్ స్కోర్ ${d.score}. మూడ్: ${d.mood}`);
  try {
    const r = await fetch(`${API}/districts/${encodeURIComponent(d.name)}`);
    const data = await r.json();
    const el = document.getElementById("distAiSummary");
    if (el && data.ai_summary) el.textContent = data.ai_summary;
  } catch {
    const el = document.getElementById("distAiSummary");
    if (el) el.textContent = `${d.name_telugu} జిల్లాలో ${d.issues[0]} ప్రధాన సమస్యగా ఉంది.`;
  }
}

/* ─── Alerts ─────────────────────────────────────────── */
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, positive: 3 };
let alertFilter = "all"; // all | red | green

function setAlertFilter(f) {
  alertFilter = f;
  document.querySelectorAll(".alert-filter-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.filter === f);
  });
  renderAlerts();
}

function renderAlerts() {
  const el = document.getElementById("alertsList");
  if (!el) return;
  let data = [...state.alertsData];
  if (alertFilter === "red")   data = data.filter((a) => a.type === "red");
  if (alertFilter === "green") data = data.filter((a) => a.type === "green");
  data.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
  el.innerHTML = data.map((a) => alertCard(a)).join("");
}

function alertCard(a) {
  const time = new Date(a.timestamp).toLocaleTimeString("te-IN", { hour: "2-digit", minute: "2-digit" });
  const isGreen = a.severity === "positive";
  const actionPrefix = isGreen ? "✅" : "⚡";
  const actionClass = isGreen ? "alert-card-action green-action" : "alert-card-action";
  const sevLabel = isGreen ? "POSITIVE ✅" : a.severity.toUpperCase();
  return `
  <div class="alert-card ${a.severity}">
    <span class="alert-card-icon">${a.icon}</span>
    <div class="alert-card-content">
      <div class="alert-card-title">${a.title_telugu}</div>
      <div class="alert-card-desc">${a.description_telugu}</div>
      <div class="${actionClass}">${actionPrefix} ${a.action_required}</div>
      <div class="alert-card-meta" style="margin-top:8px">
        <span class="alert-severity sev-${a.severity}">${sevLabel}</span>
        <span class="alert-district">📍 ${a.district}</span>
        <span class="alert-time">🕐 ${time}</span>
      </div>
    </div>
    <div class="alert-card-actions">
      <button class="alert-speak-btn" onclick="speakText('${escQ(a.description_telugu)}')">
        <i class="fas fa-volume-high"></i> వినండి
      </button>
    </div>
  </div>`;
}

function playAlertBriefing() {
  const redAlerts = state.alertsData.filter((a) => a.type === "red");
  const text = redAlerts.map((a) => `అలర్ట్: ${a.title_telugu}. ${a.action_required}`).join(". ");
  speakText("తక్షణం దృష్టి అవసరం. " + text);
}

/* ─── Impact Tracker ─────────────────────────────────── */
function renderImpact() {
  const el = document.getElementById("impactList");
  if (!el) return;
  el.innerHTML = state.impactData.map((i) => impactCard(i)).join("");
  setTimeout(() => {
    document.querySelectorAll(".impact-bar-before").forEach((b) => (b.style.width = b.dataset.w));
    document.querySelectorAll(".impact-bar-after").forEach((b) => (b.style.width = b.dataset.w));
  }, 200);
}

function impactCard(i) {
  return `
  <div class="impact-card">
    <div class="impact-scheme-name">${i.scheme_telugu}</div>
    <div class="impact-meta">
      <span>📍 ${i.district}</span>
      <span>📅 ${i.launched}</span>
      <span>👥 ${(i.beneficiaries / 100000).toFixed(1)} లక్షల మంది</span>
      <span class="impact-status-badge status-${i.status}">${i.status === "completed" ? "✅ పూర్తయింది" : "🔄 జారీలో"}</span>
    </div>
    <div class="before-after">
      <div class="ba-side">
        <div class="ba-label before">ముందు</div>
        <div class="ba-score before">${i.before.sentiment_score}</div>
        <div class="ba-desc">${i.before.description_telugu}</div>
      </div>
      <div class="ba-arrow">→</div>
      <div class="ba-side">
        <div class="ba-label after">తర్వాత</div>
        <div class="ba-score after">${i.after.sentiment_score}</div>
        <div class="ba-desc">${i.after.description_telugu}</div>
      </div>
    </div>
    <div class="impact-bar-section">
      <div class="impact-bar-label">
        <span>సెంటిమెంట్ మెరుగుదల</span>
        <span class="improvement-chip">+${i.improvement}% ↑</span>
      </div>
      <div class="impact-bar-track">
        <div class="impact-bar-before" data-w="${i.before.sentiment_score}%" style="width:0"></div>
        <div class="impact-bar-after" data-w="${i.after.sentiment_score}%" style="width:0"></div>
      </div>
    </div>
    <button class="btn-speak" onclick="speakText('${escQ(i.feedback_telugu)}')">
      <i class="fas fa-volume-high"></i> ${i.feedback_telugu}
    </button>
  </div>`;
}

/* ─── Memory System ──────────────────────────────────── */
function renderMemory() {
  const el = document.getElementById("memoryList");
  if (!el) return;
  el.innerHTML = state.memoryData.map((m) => memoryItem(m)).join("");
}

function memoryItem(m) {
  return `
  <div class="memory-item ${m.status}" id="mem-${m.id}">
    <div class="memory-priority-dot priority-${m.priority}"></div>
    <div class="memory-content">
      <div class="memory-title">${m.title}</div>
      <div class="memory-desc">${m.description}</div>
      ${m.status === "open" ? `<div class="memory-reminder">⏰ ${m.reminder}</div>` : ""}
      <div class="memory-meta">
        <span>📍 ${m.district}</span>
        <span>📅 ${m.date}</span>
        <span>${m.status === "resolved" ? "✅ పరిష్కరించబడింది" : "🔄 పెండింగ్"}</span>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${m.status === "open" ? `<button class="mem-resolve-btn" onclick="resolveMemory(${m.id})">✅ పరిష్కరించు</button>` : ""}
      <button class="mem-speak-btn" onclick="speakText('${escQ(m.reminder || m.title)}')">🔊</button>
    </div>
  </div>`;
}

async function addMemoryItem() {
  const title = document.getElementById("memTitle").value.trim();
  const district = document.getElementById("memDistrict").value;
  const priority = document.getElementById("memPriority").value;
  const desc = document.getElementById("memDesc").value.trim();
  if (!title) { showToast("⚠️ సమస్య పేరు అవసరం", "error"); return; }
  const item = { title, district, priority, description: desc, follow_up_days: 0, reminder: `${title} – నేడే నమోదు చేయబడింది` };
  try {
    const r = await fetch(API + "/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
    const d = await r.json();
    state.memoryData.unshift(d.item);
  } catch {
    item.id = Date.now(); item.date = new Date().toISOString().split("T")[0]; item.status = "open";
    state.memoryData.unshift(item);
  }
  renderMemory();
  document.getElementById("memTitle").value = "";
  document.getElementById("memDesc").value = "";
  showToast("✅ సమస్య నమోదు చేయబడింది", "success");
}

async function resolveMemory(id) {
  try {
    await fetch(`${API}/memory/${id}/resolve`, { method: "POST" });
  } catch { /* offline ok */ }
  const item = state.memoryData.find((m) => m.id === id);
  if (item) item.status = "resolved";
  renderMemory();
  showToast("✅ సమస్య పరిష్కరించబడింది", "success");
}

/* ─── Voice AI ───────────────────────────────────────── */
function setupVoiceRecognition() {
  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    state.recognition = new SR();
    state.recognition.lang = "te-IN";
    state.recognition.continuous = false;
    state.recognition.interimResults = false;
    state.recognition.onresult = (e) => {
      const query = e.results[0][0].transcript;
      document.getElementById("voiceTextInput").value = query;
      sendVoiceQuery();
    };
    state.recognition.onerror = () => {
      stopRecording();
      showToast("🎤 వాయిస్ రికగ్నిషన్ లో సమస్య", "error");
    };
    state.recognition.onend = () => stopRecording();
  }
}

function toggleVoiceRecording() {
  if (state.isRecording) { state.recognition?.stop(); stopRecording(); }
  else startRecording();
}

function startRecording() {
  if (!state.recognition) { showToast("⚠️ ఈ బ్రౌజర్‌లో వాయిస్ అందుబాటులో లేదు", "error"); return; }
  state.isRecording = true;
  document.getElementById("voiceOrb").classList.add("recording");
  document.getElementById("voiceStatus").textContent = "వినడం ప్రారంభమైంది... మాట్లాడండి";
  state.recognition.start();
}

function stopRecording() {
  state.isRecording = false;
  document.getElementById("voiceOrb").classList.remove("recording");
  document.getElementById("voiceStatus").textContent = "మీకు ఏమి సహాయం కావాలి?";
}

async function sendVoiceQuery() {
  const input = document.getElementById("voiceTextInput");
  const query = input.value.trim();
  if (!query) return;
  input.value = "";
  addChatBubble(query, "user");
  addChatBubble("ఆలోచిస్తోంది...", "ai", "thinking");
  try {
    const r = await fetch(API + "/voice/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
    const d = await r.json();
    const response = d.response || "క్షమించండి, సమాధానం అందుబాటులో లేదు.";
    removeThinkingBubble();
    addChatBubble(response, "ai");
    speakText(response);
  } catch {
    removeThinkingBubble();
    const fb = `${query} గురించి: తెలంగాణలో ఈ విషయంపై మరింత సమాచారం సేకరించబడుతోంది.`;
    addChatBubble(fb, "ai");
    speakText(fb);
  }
}

function askVoiceQuery(q) {
  document.getElementById("voiceTextInput").value = q;
  sendVoiceQuery();
}

function addChatBubble(text, type, className = "") {
  const chat = document.getElementById("voiceChat");
  const div = document.createElement("div");
  div.className = `chat-bubble ${type === "ai" ? "ai-bubble" : "user-bubble"} ${className}`;
  div.innerHTML = `<span>${text}</span>${type === "ai" ? `<button class="speak-mini" onclick="speakText('${escQ(text)}')"><i class="fas fa-volume-high"></i></button>` : ""}`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function removeThinkingBubble() {
  const thinking = document.querySelector(".thinking");
  if (thinking) thinking.remove();
}

/* ─── Daily Brief ────────────────────────────────────── */
async function playDailyBrief() {
  const btn = document.getElementById("dailyBriefBtn");
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>లోడ్ అవుతోంది...</span>';
  try {
    const r = await fetch(API + "/news/brief");
    const d = await r.json();
    const text = d.brief || getDemoBrief();
    speakText(text);
    showToast("🎙️ డైలీ బ్రీఫింగ్ ప్రారంభమైంది", "success");
  } catch {
    speakText(getDemoBrief());
    btn.classList.remove("playing");
    btn.innerHTML = `<i class="fas fa-play-circle"></i><span>1 నిమిషం బ్రీఫింగ్</span>`;
  }
}

function getDemoBrief() {
  return "శుభోదయం! నేటి తెలంగాణ అవలోకనం: హైదరాబాద్ మెట్రో ఫేజ్ 2 ఆమోదించబడింది. నిజామాబాద్‌లో నీటి సంక్షోభం కొనసాగుతోంది – తక్షణ చర్య అవసరం. వరంగల్ రైతులు పంట బీమా కోసం నిరసన తెలిపారు. కరీంనగర్‌లో రోడ్ల మరమ్మత్తు విజయవంతంగా పూర్తయింది. AI సూచన: నిజామాబాద్‌కు 20 వాటర్ ట్యాంకర్లు వెంటనే పంపాలి. ఈరోజు మీ దృష్టి అవసరమయ్యే అంశం: వరంగల్ రైతుల సమస్య.";
}

/* ─── Alert Banner ───────────────────────────────────── */
function initAlertBanner() {
  const critical = state.alertsData.filter((a) => a.severity === "critical");
  if (critical.length) {
    const banner = document.getElementById("alertBanner");
    document.getElementById("alertBannerText").textContent = "🚨 తక్షణం దృష్టి అవసరం: " + critical[0].title_telugu;
    banner.style.display = "flex";
    speakText("తక్షణం దృష్టి అవసరం: " + critical[0].title_telugu);
  }
}

function dismissBanner() {
  document.getElementById("alertBanner").style.display = "none";
}

/* ─── TTS (Text-to-Speech) — Google gTTS via backend ───── */
// We keep a single Audio element so we can stop/replace it
let _ttsAudio = null;

function speakText(text) {
  if (!text) return;
  // Stop any current playback
  if (_ttsAudio) { _ttsAudio.pause(); _ttsAudio = null; }
  window.speechSynthesis && window.speechSynthesis.cancel();

  document.getElementById("audioBarText").textContent =
    text.slice(0, 60) + (text.length > 60 ? "..." : "");
  state.isSpeaking = true;
  showAudioBar();
  setBriefBtnPlaying(true);

  // Use backend Google TTS for fluent Telugu
  fetch(API + "/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("TTS API error");
      return res.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      _ttsAudio = new Audio(url);
      _ttsAudio.onended = () => {
        URL.revokeObjectURL(url);
        _ttsAudio = null;
        hideAudioBar();
        setBriefBtnPlaying(false);
      };
      _ttsAudio.onerror = () => {
        URL.revokeObjectURL(url);
        _ttsAudio = null;
        hideAudioBar();
        setBriefBtnPlaying(false);
        _speakFallback(text);
      };
      _ttsAudio.play();
    })
    .catch(() => {
      // Fallback to browser Web Speech if backend unavailable
      hideAudioBar();
      setBriefBtnPlaying(false);
      _speakFallback(text);
    });
}

function _speakFallback(text) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "te-IN";
  utter.rate = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const teVoice = voices.find((v) => v.lang.startsWith("te") || v.name.includes("Telugu"));
  if (teVoice) utter.voice = teVoice;
  utter.onstart = () => { showAudioBar(); setBriefBtnPlaying(true); };
  utter.onend = () => { hideAudioBar(); setBriefBtnPlaying(false); };
  utter.onerror = () => { hideAudioBar(); setBriefBtnPlaying(false); };
  document.getElementById("audioBarText").textContent =
    text.slice(0, 60) + (text.length > 60 ? "..." : "");
  state.isSpeaking = true;
  window.speechSynthesis.speak(utter);
}

function setBriefBtnPlaying(isPlaying) {
  const btn = document.getElementById("dailyBriefBtn");
  if (!btn) return;
  if (isPlaying) {
    btn.classList.add("playing");
    btn.innerHTML = `<span class="wave-icon"><i></i><i></i><i></i><i></i></span><span>ప్లే అవుతోంది...</span>`;
  } else {
    btn.classList.remove("playing");
    btn.innerHTML = `<i class="fas fa-play-circle"></i><span>1 నిమిషం బ్రీఫింగ్</span>`;
  }
}

function stopSpeaking() {
  if (_ttsAudio) { _ttsAudio.pause(); _ttsAudio = null; }
  window.speechSynthesis && window.speechSynthesis.cancel();
  hideAudioBar();
  setBriefBtnPlaying(false);
}

function showAudioBar() {
  document.getElementById("audioBar").style.display = "block";
}
function hideAudioBar() {
  state.isSpeaking = false;
  document.getElementById("audioBar").style.display = "none";
}

/* ─── Populate Selects ───────────────────────────────── */
function populateDistrictSelects() {
  const selects = ["govDistrictSelect", "memDistrict"];
  selects.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    state.districtData.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.name;
      opt.textContent = d.name_telugu;
      el.appendChild(opt);
    });
  });
}

/* ─── Toast ──────────────────────────────────────────── */
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateX(40px)"; setTimeout(() => toast.remove(), 300); }, 3500);
}

/* ─── Particle System ────────────────────────────────── */
function initParticles() {
  const canvas = document.getElementById("particleCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
    r: Math.random() * 2 + 0.5,
    color: Math.random() > 0.5 ? "rgba(233,30,140," : "rgba(0,212,255,",
    alpha: Math.random() * 0.4 + 0.1,
  }));
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.alpha + ")";
      ctx.fill();
    });
    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(100,130,255,${0.08 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ─── Helpers ────────────────────────────────────────── */
function catLabel(cat) {
  const m = { infrastructure: "మౌలిక సదుపాయాలు", politics: "రాజకీయాలు", public_complaints: "ప్రజా ఫిర్యాదులు", economy: "ఆర్థిక వ్యవస్థ" };
  return m[cat] || cat;
}

function priLabel(p) {
  return p === "high" ? "అత్యవసరం" : p === "medium" ? "మధ్యస్థం" : "తక్కువ";
}

function moodEmoji(s) {
  return s === "positive" ? "😊" : s === "negative" ? "😡" : "😐";
}

function escQ(s) {
  return String(s || "").replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, " ");
}

/* ═══════════════════════════════════════════════════════
   ELECTION RESULTS 2023
   ═══════════════════════════════════════════════════════ */

const electionData = {
  parties: [
    {
      id: "inc",
      name: "Indian National Congress",
      short: "INC",
      color: "#1976d2",
      colorLight: "rgba(25,118,210,0.13)",
      icon: "🤚",
      seats: 64,
      totalSeats: 119,
      voteShare: 38.5,
      districts: ["హైదరాబాద్", "రంగారెడ్డి", "నల్గొండ", "మహబూబ్‌నగర్", "సూర్యాపేట", "జనగాం", "వరంగల్", "భద్రాద్రి కొత్తగూడెం"],
      keyConstituencies: [
        "ఖైరతాబాద్", "జూబ్లీహిల్స్", "మహేశ్వరం", "చేవెళ్ళ", "మల్కాజ్‌గిరి",
        "సంగారెడ్డి", "మిర్యాలగూడ", "నల్గొండ", "కోదాడ", "సూర్యాపేట",
        "నాగర్‌కర్నూల్", "వనపర్తి", "జనగాం", "పాలేరు", "ఖమ్మం"
      ],
      negative: [
        {
          category: "infrastructure", icon: "🏗️", label: "మౌలిక సదుపాయాలు",
          issues: [
            "నల్గొండ-సూర్యాపేట రహదారులు మరమ్మత్తు అవసరం",
            "మహేశ్వరం-శాద్నగర్‌లో డ్రైనేజీ వ్యవస్థ లేకపోవడం",
            "గ్రామీణ విద్యుత్ సరఫరాలో తరచూ అంతరాయాలు",
            "మహబూబ్‌నగర్ జిల్లాలో తాగునీటి కొరత"
          ]
        },
        {
          category: "public_complaints", icon: "📣", label: "ప్రజా ఫిర్యాదులు",
          issues: [
            "రేషన్ కార్డులు 12,000+ పెండింగ్‌లో ఉన్నాయి",
            "దళిత బస్తీలలో పారిశుధ్య సమస్యలు",
            "సంక్షేమ పింఛన్లు ఆలస్యంగా అందుతున్నాయి",
            "బీసీ వసతి గృహాలలో సౌకర్యాల కొరత"
          ]
        },
        {
          category: "economy", icon: "💰", label: "ఆర్థిక వ్యవస్థ",
          issues: [
            "రైతు బంధు పేమెంట్లు ఆలస్యంగా అందుతున్నాయి",
            "వ్యవసాయ రుణ మాఫీ పూర్తిగా అమలు కాలేదు",
            "చేనేత కార్మికుల ఆదాయ నష్టం కొనసాగుతోంది",
            "నిరుద్యోగ యువతలో అసంతృప్తి పెరుగుతోంది"
          ]
        },
        {
          category: "health", icon: "🏥", label: "ఆరోగ్యం",
          issues: [
            "ప్రాథమిక ఆరోగ్య కేంద్రాలలో డాక్టర్లు లేకపోవడం",
            "గ్రామీణ ఆసుపత్రులలో మందుల కొరత",
            "నల్గొండ జిల్లాలో ఫ్లోరైడ్ నీటి సమస్య కొనసాగుతోంది"
          ]
        }
      ],
      positive: [
        {
          category: "governance", icon: "🏛️", label: "పాలన",
          achievements: [
            "100 రోజుల్లో 6 ముఖ్యమైన హామీలు అమలు",
            "200 కొత్త ప్రభుత్వ పోస్టులు భర్తీ",
            "మహిళా శక్తి ప్రోగ్రామ్ ప్రారంభం",
            "రైతు రుణ మాఫీ ప్రక్రియ మొదలైంది"
          ]
        },
        {
          category: "infrastructure", icon: "🏗️", label: "మౌలిక సదుపాయాలు",
          achievements: [
            "హైదరాబాద్ మెట్రో ఫేజ్-2 ఆమోదం పొందింది",
            "మూసీ నది పునరుద్ధరణ ప్రాజెక్ట్ ప్రారంభం",
            "500 కొత్త స్కూల్ భవనాల నిర్మాణం",
            "GHMC లో 200 కి.మీ రోడ్లు మరమ్మత్తు పూర్తి"
          ]
        },
        {
          category: "welfare", icon: "🤝", label: "సంక్షేమం",
          achievements: [
            "మహిళలకు ఉచిత బస్ ప్రయాణం అమలు",
            "ఇందిరమ్మ గృహాలు – 1 లక్ష ఇళ్ళు ప్రారంభం",
            "₹2 కిలో బియ్యం పథకం కొనసాగింపు",
            "అర్హులైన కుటుంబాలకు ₹500 గ్యాస్ సిలిండర్"
          ]
        },
        {
          category: "economy", icon: "💰", label: "ఆర్థిక వ్యవస్థ",
          achievements: [
            "IT కారిడార్ విస్తరణ – 50,000 కొత్త ఉద్యోగాలు",
            "హైదరాబాద్ ఫార్మా సిటీ ఆమోదం పొందింది",
            "స్టార్టప్ పాలసీ అమలులోకి వచ్చింది",
            "హ్యాండ్‌లూమ్ ఎగుమతులలో 15% వృద్ధి"
          ]
        }
      ]
    },
    {
      id: "brs",
      name: "Bharat Rashtra Samithi",
      short: "BRS",
      color: "#e65100",
      colorLight: "rgba(230,81,0,0.13)",
      icon: "🌸",
      seats: 39,
      totalSeats: 119,
      voteShare: 37.4,
      districts: ["సిర్సిల్లా", "కరీంనగర్", "నిజామాబాద్", "ఆదిలాబాద్", "కామారెడ్డి", "పెద్దపల్లి", "యాదాద్రి", "జగిత్యాల"],
      keyConstituencies: [
        "సిర్సిల్లా", "గజ్వేల్", "నిర్మల్", "కామారెడ్డి", "కరీంనగర్",
        "హుజురాబాద్", "సుల్తానాబాద్", "పెద్దపల్లి", "మంచిర్యాల", "అచ్చంపేట",
        "నాగర్కర్నూల్", "కొల్లాపూర్", "మేడ్చల్", "ఘట్‌కేసర్"
      ],
      negative: [
        {
          category: "agriculture", icon: "🌾", label: "వ్యవసాయం",
          issues: [
            "సిర్సిల్లాలో పత్తి రైతులకు మద్దతు ధర అందడం లేదు",
            "కరీంనగర్ రైతుల పంట నష్టానికి పరిహారం రాలేదు",
            "ఆదిలాబాద్‌లో సాగు నీటి కొరత తీవ్రంగా ఉంది",
            "రైతు బంధు పెండింగ్ పేమెంట్లు ₹1200 కోట్లు"
          ]
        },
        {
          category: "public_complaints", icon: "📣", label: "ప్రజా ఫిర్యాదులు",
          issues: [
            "BRS నేతలపై ED/CBI దర్యాప్తులు జారీ",
            "కార్యకర్తలపై నమోదైన కేసులు పెండింగ్",
            "ప్రజా సమస్యలకు ప్రతిపక్షంగా పరిష్కారం సాధ్యపడటం లేదు",
            "ప్రభుత్వ విధానాలపై తీవ్ర విమర్శలు"
          ]
        },
        {
          category: "infrastructure", icon: "🏗️", label: "మౌలిక సదుపాయాలు",
          issues: [
            "నిజామాబాద్ పట్టణంలో రోడ్లు దెబ్బతిన్నాయి",
            "కామారెడ్డి ఆసుపత్రి నిర్మాణం ఆగిపోయింది",
            "మంచిర్యాల తాగునీటి ప్రాజెక్ట్ అసంపూర్తి"
          ]
        },
        {
          category: "politics", icon: "⚖️", label: "రాజకీయాలు",
          issues: [
            "ప్రముఖ నాయకులు కాంగ్రెస్‌లో చేరుతున్నారు",
            "పార్టీ పునర్నిర్మాణంలో ఇబ్బందులు",
            "ప్రజల నమ్మకం తిరిగి పొందే సవాల్"
          ]
        }
      ],
      positive: [
        {
          category: "past_achievements", icon: "🏆", label: "గత విజయాలు",
          achievements: [
            "కళేశ్వరం ప్రాజెక్ట్ (ప్రపంచంలో అతిపెద్ద లిఫ్ట్ ఇరిగేషన్)",
            "T-Hub – ఆసియాలో అతిపెద్ద IT ఇన్నోవేషన్ కేంద్రం",
            "TSRTC ఆధునికీకరణ – 500 కొత్త బస్సులు",
            "10 సంవత్సరాల్లో GSDP రెట్టింపు"
          ]
        },
        {
          category: "welfare", icon: "🤝", label: "సంక్షేమం",
          achievements: [
            "రైతు బంధు – ప్రతి ఎకరాకు ₹10,000 పంటకాలం",
            "కల్యాణ లక్ష్మి – 2 లక్షల పెళ్ళిళ్ళకు ₹1.01 లక్ష",
            "ఆసరా పింఛన్లు ₹2,016/నెల క్రమం తప్పకుండా",
            "దళిత బంధు – 10,000 కుటుంబాలకు ₹10 లక్షలు"
          ]
        },
        {
          category: "infrastructure", icon: "🏗️", label: "మౌలిక సదుపాయాలు",
          achievements: [
            "మిషన్ భగీరథ – కరీంనగర్, సిర్సిల్లాలో విజయవంతం",
            "DRDO R&D కేంద్రం కరీంనగర్‌లో ఏర్పాటు",
            "పెద్దపల్లి NTPC విద్యుత్ ఉత్పత్తి 4,000 MW పెరిగింది"
          ]
        },
        {
          category: "economy", icon: "💰", label: "ఆర్థిక వ్యవస్థ",
          achievements: [
            "ఫార్మా విభాగంలో 20% వార్షిక వృద్ధి",
            "ఆదిలాబాద్ ఫర్నిచర్ పార్క్ – 5,000 ఉద్యోగాలు",
            "BRS పాలన కాలంలో రాష్ట్ర GSDP 18% వృద్ధి"
          ]
        }
      ]
    },
    {
      id: "bjp",
      name: "Bharatiya Janata Party",
      short: "BJP",
      color: "#ff5722",
      colorLight: "rgba(255,87,34,0.13)",
      icon: "🪷",
      seats: 8,
      totalSeats: 119,
      voteShare: 13.9,
      districts: ["హైదరాబాద్"],
      keyConstituencies: [
        "గోషామహల్", "అంబర్‌పేట", "ముషీరాబాద్", "సికింద్రాబాద్ కంటోన్మెంట్",
        "ఉప్పల్", "ఇబ్రహీంపట్నం", "తుక్కుగూడ", "బాలానగర్"
      ],
      negative: [
        {
          category: "public_complaints", icon: "📣", label: "ప్రజా ఫిర్యాదులు",
          issues: [
            "గోషామహల్ అల్లర్ల పరిణామాలు పరిష్కారం కాలేదు",
            "BJP పాలిత నగర పాలక సంస్థలలో అవినీతి ఆరోపణలు",
            "ఓల్డ్ సిటీ అభివృద్ధి లేకపోవడంపై విమర్శలు",
            "మతపరమైన ఉద్రిక్తతలపై ఆందోళనలు"
          ]
        },
        {
          category: "infrastructure", icon: "🏗️", label: "మౌలిక సదుపాయాలు",
          issues: [
            "అంబర్‌పేట్ వరద నిర్వహణ సమస్యలు",
            "సికింద్రాబాద్ కంటోన్మెంట్ రోడ్ల మరమ్మత్తు ఆగిపోయింది",
            "ఉప్పల్‌లో ట్రాఫిక్ జాం తీవ్ర సమస్య"
          ]
        },
        {
          category: "politics", icon: "⚖️", label: "రాజకీయాలు",
          issues: [
            "తెలంగాణలో పార్టీ మూడవ స్థానానికి పడిపోవడం",
            "రాష్ట్ర నాయకత్వ వివాదాలు పరిష్కారం కాలేదు",
            "కేంద్ర-రాష్ట్ర నిధుల పంపిణీ వివాదం"
          ]
        }
      ],
      positive: [
        {
          category: "governance", icon: "🏛️", label: "కేంద్ర పాలన",
          achievements: [
            "PM ఆవాస్ యోజన – 50,000 గృహాలు మంజూరు",
            "జన్ ధన్ ఖాతాలు – 20 లక్షల కొత్త ఖాతాలు",
            "ఆయుష్మాన్ భారత్ – 5 లక్షల కుటుంబాలకు లబ్ధి",
            "స్వామిత్వ పథకం – భూమి హక్కుల రికార్డులు"
          ]
        },
        {
          category: "infrastructure", icon: "🏗️", label: "మౌలిక సదుపాయాలు",
          achievements: [
            "NH-44 విస్తరణ పూర్తయింది",
            "ISRO – హైదరాబాద్ SLP కేంద్రం ఏర్పాటు",
            "NCRTC హైదరాబాద్ రీజనల్ రైల్ ప్రాజెక్ట్ ప్రతిపాదన"
          ]
        },
        {
          category: "economy", icon: "💰", label: "ఆర్థిక వ్యవస్థ",
          achievements: [
            "PLI పథకం – ఫార్మా సెక్టార్‌లో ₹3,000 కోట్లు",
            "రక్షణ ఉత్పత్తి హైదరాబాద్ – కొత్త యూనిట్లు",
            "డిజిటల్ ఇండియా – 1,000 బ్రాడ్‌బ్యాండ్ గ్రామాలు"
          ]
        }
      ]
    },
    {
      id: "aimim",
      name: "All India Majlis-e-Ittehadul Muslimeen",
      short: "AIMIM",
      color: "#00897b",
      colorLight: "rgba(0,137,123,0.13)",
      icon: "☪️",
      seats: 7,
      totalSeats: 119,
      voteShare: 2.8,
      districts: ["హైదరాబాద్ ఓల్డ్ సిటీ"],
      keyConstituencies: [
        "చార్మినార్", "చాందర్‌యాన్‌గూట", "యాకుత్‌పురా", "బహదూర్‌పురా",
        "నాంపల్లి", "కర్వాన్", "మాలేపల్లి"
      ],
      negative: [
        {
          category: "infrastructure", icon: "🏗️", label: "మౌలిక సదుపాయాలు",
          issues: [
            "ఓల్డ్ సిటీలో పురాతన భవనాలు కూలిపోయే ప్రమాదం",
            "మురుగునీటి వ్యవస్థ మరమ్మత్తు అత్యవసరం",
            "ఇరుకు సందుల్లో అంబులెన్స్ వెళ్ళలేకపోవడం",
            "నివాస స్థలాల కొరత తీవ్రంగా ఉంది"
          ]
        },
        {
          category: "economy", icon: "💰", label: "ఆర్థిక వ్యవస్థ",
          issues: [
            "చిన్న వ్యాపారులకు బ్యాంక్ రుణాలు అందడం కష్టంగా ఉంది",
            "ముస్లిం యువతకు ఉద్యోగ అవకాశాలు తక్కువ",
            "చేతి వృత్తి కళాకారులకు మార్కెట్ లేకపోవడం"
          ]
        },
        {
          category: "education", icon: "📚", label: "విద్య",
          issues: [
            "ఓల్డ్ సిటీ స్కూళ్ళలో ఉపాధ్యాయుల కొరత",
            "ఉర్దూ మీడియం పాఠశాలల మూత వేయడం",
            "ఉన్నత విద్యకు ప్రైవేట్ కళాశాలలపై అధిక ఆధారపడటం"
          ]
        }
      ],
      positive: [
        {
          category: "welfare", icon: "🤝", label: "సమాజ సంక్షేమం",
          achievements: [
            "ఓల్డ్ సిటీ మదర్సాల ఆధునికీకరణ",
            "AIMIM ఆసుపత్రుల ఉచిత వైద్య సేవలు 50,000+",
            "రమజాన్ ఫుడ్ కిట్లు – 50,000 కుటుంబాలకు",
            "వితంతు మహిళలకు ఆర్థిక సహాయం"
          ]
        },
        {
          category: "education", icon: "📚", label: "విద్య",
          achievements: [
            "ఓల్డ్ సిటీలో 20 కొత్త ఇంగ్లీష్ మీడియం పాఠశాలలు",
            "స్కాలర్‌షిప్‌లు – 10,000 మంది విద్యార్థులకు",
            "మహిళా కళాశాలలో సీట్ల పెంపు",
            "30+ కంప్యూటర్ శిక్షణ కేంద్రాలు ఏర్పాటు"
          ]
        },
        {
          category: "infrastructure", icon: "🏗️", label: "మౌలిక సదుపాయాలు",
          achievements: [
            "చార్మినార్ చుట్టుపక్కల రోడ్ల విస్తరణ",
            "ఓల్డ్ సిటీ మెట్రో స్టేషన్లు ప్రతిపాదన",
            "100 స్ట్రీట్ లైట్లు ఏర్పాటు",
            "3 కొత్త పార్కులు నిర్మాణం"
          ]
        }
      ]
    },
    {
      id: "cpi",
      name: "Communist Party of India",
      short: "CPI",
      color: "#c62828",
      colorLight: "rgba(198,40,40,0.13)",
      icon: "⭐",
      seats: 1,
      totalSeats: 119,
      voteShare: 0.8,
      districts: ["యాదాద్రి భువనగిరి"],
      keyConstituencies: ["భువనగిరి"],
      negative: [
        {
          category: "agriculture", icon: "🌾", label: "వ్యవసాయం",
          issues: [
            "భువనగిరి జిల్లా రైతులకు MSP అందడం లేదు",
            "రైతు ఉద్యమ నేతల అరెస్టులు జరుగుతున్నాయి",
            "సాగు నీటి పంపిణీలో అన్యాయం"
          ]
        },
        {
          category: "public_complaints", icon: "📣", label: "ప్రజా ఫిర్యాదులు",
          issues: [
            "కార్మికుల ESI-PF పరిష్కారం లేదు",
            "ఉపాధి హామీ పనులు తక్కువగా కేటాయించబడుతున్నాయి"
          ]
        }
      ],
      positive: [
        {
          category: "welfare", icon: "🤝", label: "సంక్షేమం",
          achievements: [
            "రైతు సంఘాల ద్వారా అగ్రికల్చర్ లోన్ వేవర్ ఒత్తిడి",
            "భువనగిరి లేబర్ హక్కుల కేంద్రం స్థాపన",
            "200+ మహిళా సహాయ సంఘాలు ఏర్పాటు"
          ]
        },
        {
          category: "politics", icon: "⚖️", label: "రాజకీయ ప్రభావం",
          achievements: [
            "కాంగ్రెస్‌తో పొత్తు ద్వారా ప్రభుత్వంపై ప్రభావం",
            "కనీస వేతన పెంపు ఒత్తిడి విజయవంతం",
            "కార్మిక హక్కుల బిల్లులో మెరుగులు సాధించాం"
          ]
        }
      ]
    }
  ]
};

/* ─── Election active party state ───────────────────── */
let activeElectionParty = null;
let activeEdpSection = "constituencies";

/* ─── Render Election Tab ────────────────────────────── */
function renderElectionResults() {
  renderElectionCharts();
  renderElectionPartyCards();
}

function renderElectionCharts() {
  // Donut chart
  const ctx1 = document.getElementById("electionDonutChart");
  if (ctx1) {
    if (state.charts.electionDonut) state.charts.electionDonut.destroy();
    const parties = electionData.parties;
    const others = 119 - parties.reduce((s, p) => s + p.seats, 0);
    state.charts.electionDonut = new Chart(ctx1, {
      type: "doughnut",
      data: {
        labels: [...parties.map(p => p.short), "ఇతరులు"],
        datasets: [{
          data: [...parties.map(p => p.seats), others],
          backgroundColor: [...parties.map(p => p.color), "#555"],
          borderWidth: 2,
          borderColor: "rgba(0,0,0,0.3)",
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "60%",
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw} సీట్లు` } }
        },
        animation: { animateRotate: true, duration: 1200 }
      }
    });

    // Legend
    const legEl = document.getElementById("electionLegend");
    if (legEl) {
      legEl.innerHTML = parties.map(p =>
        `<div class="election-leg-item">
          <div class="election-leg-dot" style="background:${p.color}"></div>
          <span>${p.short}: ${p.seats}</span>
        </div>`
      ).join("") + `<div class="election-leg-item"><div class="election-leg-dot" style="background:#555"></div><span>ఇతరులు: ${others}</span></div>`;
    }
  }

  // Bar chart – seats + vote share
  const ctx2 = document.getElementById("electionBarChart");
  if (ctx2) {
    if (state.charts.electionBar) state.charts.electionBar.destroy();
    const parties = electionData.parties;
    state.charts.electionBar = new Chart(ctx2, {
      type: "bar",
      data: {
        labels: parties.map(p => p.short),
        datasets: [
          {
            label: "సీట్లు",
            data: parties.map(p => p.seats),
            backgroundColor: parties.map(p => p.color + "cc"),
            borderRadius: 6, borderSkipped: false,
            yAxisID: "y"
          },
          {
            label: "ఓట్ల శాతం %",
            data: parties.map(p => p.voteShare),
            backgroundColor: parties.map(p => p.color + "44"),
            borderColor: parties.map(p => p.color),
            borderWidth: 2,
            type: "line",
            tension: 0.3,
            pointBackgroundColor: parties.map(p => p.color),
            pointRadius: 5,
            yAxisID: "y2"
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { labels: { color: "#7986cb", font: { size: 10 }, boxWidth: 12 } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#7986cb", font: { size: 11, weight: "600" } } },
          y: {
            grid: { color: "rgba(255,255,255,0.04)" },
            ticks: { color: "#7986cb" }, position: "left",
            title: { display: true, text: "సీట్లు", color: "#7986cb", font: { size: 10 } }
          },
          y2: {
            grid: { display: false },
            ticks: { color: "#7986cb", callback: v => v + "%" }, position: "right",
            title: { display: true, text: "ఓట్ల %", color: "#7986cb", font: { size: 10 } }
          }
        },
        animation: { duration: 1200 }
      }
    });
  }
}

function renderElectionPartyCards() {
  const el = document.getElementById("electionPartyCards");
  if (!el) return;
  el.innerHTML = electionData.parties.map(p => electionPartyCard(p)).join("");
  el.querySelectorAll(".election-party-card").forEach((c, i) => {
    c.style.opacity = 0; c.style.transform = "translateY(24px)";
    setTimeout(() => { c.style.transition = "all 0.4s ease"; c.style.opacity = 1; c.style.transform = ""; }, i * 100);
  });
}

function electionPartyCard(p) {
  const pct = Math.round((p.seats / p.totalSeats) * 100);
  const negCount = p.negative.reduce((s, n) => s + n.issues.length, 0);
  const posCount = p.positive.reduce((s, pos) => s + pos.achievements.length, 0);
  return `
  <div class="election-party-card" style="border-color:${p.color}33;--party-color:${p.color}" onclick="selectElectionParty('${p.id}')">
    <div class="epc-top">
      <div class="epc-icon" style="background:${p.colorLight};color:${p.color}">${p.icon}</div>
      <div class="epc-info">
        <div class="epc-short" style="color:${p.color}">${p.short}</div>
        <div class="epc-name">${p.name}</div>
      </div>
      <div class="epc-seats" style="color:${p.color}">${p.seats}</div>
    </div>
    <div class="epc-bar-track">
      <div class="epc-bar-fill" style="background:${p.color};width:${pct}%" data-w="${pct}%"></div>
    </div>
    <div class="epc-bottom">
      <span class="epc-stat neg">⚠️ ${negCount} సమస్యలు</span>
      <span class="epc-stat pos">✅ ${posCount} విజయాలు</span>
      <span class="epc-vote">${p.voteShare}% ఓట్లు</span>
    </div>
  </div>`;
}

function selectElectionParty(partyId) {
  activeElectionParty = electionData.parties.find(p => p.id === partyId);
  if (!activeElectionParty) return;

  // Highlight selected card
  document.querySelectorAll(".election-party-card").forEach(c => c.classList.remove("selected"));
  const selected = document.querySelector(`[onclick="selectElectionParty('${partyId}')"]`);
  if (selected) selected.classList.add("selected");

  // Show detail panel
  const panel = document.getElementById("electionDetailPanel");
  panel.style.display = "block";
  panel.scrollIntoView({ behavior: "smooth", block: "start" });

  // Reset tabs
  document.querySelectorAll(".edp-tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".edp-tab-btn")[0].classList.add("active");
  activeEdpSection = "constituencies";

  renderEdpHeader();
  renderEdpContent();
}

function renderEdpHeader() {
  const p = activeElectionParty;
  const el = document.getElementById("edpHeader");
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div style="font-size:2.5rem;background:${p.colorLight};border-radius:50%;width:56px;height:56px;display:flex;align-items:center;justify-content:center">${p.icon}</div>
      <div>
        <div style="font-size:1.4rem;font-weight:700;color:${p.color}">${p.short} – ${p.seats} సీట్లు</div>
        <div style="font-size:0.85rem;color:var(--text-muted)">${p.name}</div>
        <div style="display:flex;gap:12px;margin-top:6px;flex-wrap:wrap">
          <span style="font-size:0.75rem;background:${p.colorLight};color:${p.color};padding:3px 10px;border-radius:20px;font-weight:600">
            ${p.voteShare}% ఓట్ల వాటా
          </span>
          <span style="font-size:0.75rem;background:rgba(255,255,255,0.05);color:var(--text-muted);padding:3px 10px;border-radius:20px">
            📍 ${p.districts.slice(0,3).join(", ")}${p.districts.length > 3 ? " + మరిన్ని" : ""}
          </span>
        </div>
      </div>
    </div>`;
}

function showEdpSection(section) {
  activeEdpSection = section;
  document.querySelectorAll(".edp-tab-btn").forEach((b, i) => {
    const sections = ["constituencies", "negative", "positive"];
    b.classList.toggle("active", sections[i] === section);
  });
  renderEdpContent();
}

function renderEdpContent() {
  const p = activeElectionParty;
  const el = document.getElementById("edpContent");
  if (!el || !p) return;

  if (activeEdpSection === "constituencies") {
    el.innerHTML = `
      <div class="edp-section-title" style="color:${p.color}">
        <i class="fas fa-map-marker-alt"></i> ${p.short} గెలిచిన నియోజకవర్గాలు (${p.keyConstituencies.length} ముఖ్యమైనవి)
      </div>
      <div class="edp-const-grid">
        ${p.keyConstituencies.map((c, i) => `
          <div class="edp-const-item" style="border-left-color:${p.color};animation-delay:${i * 40}ms">
            <span class="edp-const-num" style="color:${p.color}">${i+1}</span>
            <span class="edp-const-name">${c}</span>
          </div>`).join("")}
      </div>
      <div style="margin-top:16px;padding:12px;background:${p.colorLight};border-radius:10px;font-size:0.82rem;color:var(--text-muted)">
        🗺️ జిల్లాలు: ${p.districts.join(" • ")}
      </div>`;
  }

  if (activeEdpSection === "negative") {
    el.innerHTML = `
      <div class="edp-section-title" style="color:var(--danger)">
        <i class="fas fa-circle-exclamation"></i> ${p.short} గెలిచిన స్థానాలలో సమస్యలు – వర్గాల వారీగా
      </div>
      ${p.negative.map(cat => `
        <div class="edp-category-block negative">
          <div class="edp-cat-header">
            <span class="edp-cat-icon">${cat.icon}</span>
            <span class="edp-cat-label">${cat.label}</span>
            <span class="edp-cat-count">${cat.issues.length} సమస్యలు</span>
          </div>
          <div class="edp-issues-list">
            ${cat.issues.map(issue => `
              <div class="edp-issue-item">
                <span class="edp-issue-dot" style="background:var(--danger)"></span>
                <span>${issue}</span>
              </div>`).join("")}
          </div>
        </div>`).join("")}`;
  }

  if (activeEdpSection === "positive") {
    el.innerHTML = `
      <div class="edp-section-title" style="color:var(--success)">
        <i class="fas fa-circle-check"></i> ${p.short} గెలిచిన స్థానాలలో విజయాలు – వర్గాల వారీగా
      </div>
      ${p.positive.map(cat => `
        <div class="edp-category-block positive">
          <div class="edp-cat-header">
            <span class="edp-cat-icon">${cat.icon}</span>
            <span class="edp-cat-label">${cat.label}</span>
            <span class="edp-cat-count">${cat.achievements.length} విజయాలు</span>
          </div>
          <div class="edp-issues-list">
            ${cat.achievements.map(ach => `
              <div class="edp-issue-item">
                <span class="edp-issue-dot" style="background:var(--success)"></span>
                <span>${ach}</span>
              </div>`).join("")}
          </div>
        </div>`).join("")}`;
  }
}
