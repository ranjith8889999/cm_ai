# 🏛️ తెలంగాణ AI గవర్నెన్స్ డాష్‌బోర్డ్
### Telangana AI Governance Intelligence System

A full-stack, AI-powered Telugu governance dashboard built for the Chief Minister of Telangana — featuring real-time district sentiment heatmaps, AI news briefings in Telugu, voice interaction, red alert notifications, public opinion analytics, and smart governance suggestions powered by **Groq (Llama 3.3-70B)** with **PostgreSQL + pgvector** for semantic accuracy.

---

## 🖼️ Overview

This system gives a single-pane view of the entire state of Telangana across **9 intelligent tabs**, all fully functional in Telugu — text, audio, and AI responses.

---

## ✨ Features

### 1. 🏠 Dashboard (డాష్‌బోర్డ్)
- Personalized **Good Morning/Afternoon/Evening** greeting for the Chief Minister
- Live clock and Telugu date display
- At-a-glance **state stats**: Total districts, active alerts, positive news count, AI suggestions
- **Mood Donut Chart** — visual breakdown of happy/neutral/angry districts
- **7-Day Sentiment Trend Line** — track public mood over the week
- Quick news preview panel (top 5 headlines)
- Critical alert summary
- Pending memory reminders

### 2. 📰 News (వార్తలు) — AI News Briefing
- **12 real-time Telangana news cards** with:
  - 🟢 Positive / 🔴 Negative sentiment indicators
  - Category filters: Infrastructure | Politics | Public Complaints | Economy
  - **"What this means"** section (impact explanation in Telugu)
  - Per-card Telugu audio playback via browser TTS
  - **AI summarize button** — sends to Groq API for instant Telugu summary
- **Bulk AI Summary** — summarizes all visible news in one click
- Summaries written by a *Senior TV journalist persona* (CREATE framework) — governance impact lens, not just news reporting

### 3. 📊 Public Opinion (ప్రజా అభిప్రాయం)
- **Animated poll bars** — road quality, hospital rating, governance satisfaction
- District-wise mood breakdown (happy / neutral / angry percentages)
- **7-day trend comparison** — "Last week vs today"
- District sentiment bar chart (top 8 districts)
- Total response counts from simulated social/survey data
- **AI Sentiment Insight** — political analysis linking score to electoral implications (CREATE framework: Senior Political Analyst persona with 20 years election data)

### 4. 🤖 AI Governance Suggestions (AI సూచనలు) — FLAGSHIP FEATURE
- Powered by **Groq Llama 3.3-70B** with **pgvector semantic search**
- Suggestions enriched with **20 proven Indian state governance models** from the knowledge base
- Per-district filter — generate suggestions for any of 33 districts
- Each suggestion card shows:
  - ⚠️ **Problem** (in Telugu) — with quantified impact
  - 📊 **Impact** (who is affected, scale, cost of inaction)
  - 💡 **AI Suggestion** (cites proven state model — Kerala, Gujarat, Karnataka, etc.)
  - 📋 **Step-by-step action items** (2 steps each with timelines)
  - Priority level: 🔴 Critical / 🟡 Medium / 🟢 Low
- **CREATE Framework persona**: T. Venkata Reddy (IAS, 28 years, former Karimnagar Collector)
- **Chain-of-Thought reasoning**: Quantify → Benchmark → Adapt → Implement
- **Response caching** in PostgreSQL — 2-hour TTL for faster repeated queries

### 5. 🗺️ District Heatmap (జిల్లా మ్యాప్)
- **33 Telangana districts** plotted on SVG state map
- Color-coded circles:
  - 🟢 Green = Sentiment score 60+ (Happy)
  - 🟡 Yellow = Score 40–60 (Neutral)
  - 🔴 Red = Score < 40 (Alert)
- **Pulsing animation** on each district circle
- **Click any district** → See name, score, mood, issues, positive/negative news count
- **AI-generated Telugu summary** — *District Intelligence Bureau officer persona* (CREATE framework)
- Automatic voice readout of district status

### 6. 🚨 Red Alert System (రెడ్ అలర్ట్లు)
- **Auto-triggers on page load** if critical alerts exist — banner at top with audio
- Alert cards with severity: Critical / High / Medium
- **AI Analysis & Resolution** per context (alerts/districts/news/governance):
  - **CREATE Framework**: Named personas (IPS/IAS officers, senior administrators) with 25-32 years experience
  - **5-step Chain-of-Thought** reasoning (severity triage → root cause → state benchmarking → adaptation → sequencing)
  - **pgvector knowledge base** injects 3 most relevant proven state programs as context
  - Each resolution step: `[Timeframe] [Department]: [Action] — [State model] — [Measurable target]`
  - **Response cached** in PostgreSQL — 6-hour TTL

### 7. 📈 Before vs After Impact Tracker (ప్రభావ ట్రాకర్)
- Track sentiment improvement after government schemes
- **Animated comparison bars** — before score (red) → after score (green)
- Shows: scheme name, district, beneficiaries, cost, launch date
- Improvement percentage chip (e.g., `+37% ↑`)
- Telugu feedback quote for each scheme

### 8. 🧠 Memory System (జ్ఞాపక వ్యవస్థ)
- **Add any issue/priority** via form — saves with district, priority, description
- Auto-generates Telugu follow-up reminders
- Tracks days pending for each open issue
- **Resolve button** — marks issues as resolved
- Priority indicators: 🔴 High (pulsing) / 🟡 Medium / 🟢 Low

### 9. 🎤 Voice AI (వాయిస్ AI)
- Tap the **microphone orb** → speak in Telugu/English → get Telugu response
- OR type a query in text box → AI answers in Telugu
- **CREATE Framework**: Principal Secretary persona (26 years IAS, knows all 33 districts)
- **pgvector context** — relevant state precedents injected into answers
- Conversational chat UI with audio playback on every response
- Suggested queries: *"Warangal situation enti?"*, *"Nizamabad water problem?"*, *"నేటి top 3 సమస్యలు"*

### 🎙️ 1-Minute Daily Brief
- One-click button in the top bar
- Groq generates a 60-second Telugu morning briefing — governance impact, public mood, key alerts, action item
- **CREATE Framework**: Senior intelligence brief writer persona (20 years CMO experience)
- Auto-plays as audio

---

## 🧠 AI Intelligence Architecture

### CREATE Framework (All Prompts)

Every AI prompt follows the **CREATE** structure for maximum accuracy:

| Element | Description | Example |
|---|---|---|
| **C**haracter | Named expert persona with credentials | "T. Venkata Reddy, IAS 1997, 28 years Telangana" |
| **R**equest | Precisely defined task | "Generate 3 high-priority governance suggestions" |
| **E**xamples | Few-shot sample output | Full example JSON inline |
| **A**djustments | Constraints, political context, style | "90-day achievability, electoral proximity" |
| **T**ype of Output | Exact format | "Valid JSON array, exactly 3 items" |
| **E**xtras | Chain-of-thought, guardrails | "Step 1: Quantify → Step 2: Benchmark..." |

### Chain-of-Thought Reasoning (Analysis)

The analysis endpoint uses mandatory 5-step CoT:
```
Step 1 — Severity triage: Rank by urgency × scale × political risk
Step 2 — Root cause: Structural (years of neglect) vs situational
Step 3 — State benchmarking: 2+ Indian states that solved this
Step 4 — Telangana adaptation: Local budget + staff + political context
Step 5 — Sequencing: Order by feasibility × urgency
```

### PostgreSQL + pgvector Knowledge Base

- **20 governance case studies** pre-seeded: water, healthcare, roads, agriculture, education, disaster, employment, electricity, governance, migration, nutrition, urban
- **384-dimensional semantic embeddings** (paraphrase-multilingual-MiniLM-L12-v2) supporting Telugu + English
- **HNSW index** for sub-millisecond approximate nearest-neighbor search
- Vector search finds the 3 most relevant state models for any query
- **Response cache** with 2-6 hour TTL eliminates redundant Groq API calls
- Falls back to PostgreSQL full-text search if embeddings are unavailable

### Model Selection

| Task | Model | Reason |
|---|---|---|
| Analysis, suggestions | `llama-3.3-70b-versatile` | Deep reasoning, state benchmarking |
| Summaries, Q&A, brief | `llama-3.1-8b-instant` | Speed — sub-second latency |

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla HTML5 + CSS3 + JavaScript (SPA) |
| **Charts** | Chart.js 4.4 |
| **Icons** | Font Awesome 6.5 |
| **Fonts** | Google Fonts — Noto Sans Telugu + Inter |
| **Backend** | Python 3.12 + Flask 3.0 |
| **AI (Fast)** | Groq API — Llama 3.1-8B-Instant |
| **AI (Expert)** | Groq API — Llama 3.3-70B-Versatile |
| **Vector DB** | PostgreSQL 15 + pgvector extension |
| **Embeddings** | sentence-transformers (paraphrase-multilingual-MiniLM-L12-v2, 384-dim) |
| **DB Adapter** | psycopg2-binary |
| **Response Cache** | PostgreSQL `response_cache` table (TTL-based) |
| **CORS** | Flask-CORS |
| **TTS** | gTTS (server-side) + Web Speech API (browser fallback) |
| **Scheduler** | APScheduler 3.x BackgroundScheduler |
| **Production Server** | Gunicorn (WSGI) |
| **Container** | Docker / EasyPanel |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  BROWSER  (Presentation Layer)                                      │
│  index.html + css/styles.css + js/main.js                           │
│  • Renders 9 tab panels as a Single Page App                        │
│  • All API calls through fetchJSON() → /api/* endpoints             │
└────────────────────────┬────────────────────────────────────────────┘
                         │  HTTP (REST JSON)
┌────────────────────────▼────────────────────────────────────────────┐
│  FLASK API SERVER  (Routing + Orchestration)                        │
│  backend/app.py                                                     │
│  • 15 REST endpoints → one UI feature each                          │
│  • Delegates AI work to groq_service.py                             │
│  • Data reads/writes to JSON files in data/                         │
└──────┬────────────────────────────┬──────────────────────────────────┘
       │                            │
┌──────▼──────────────┐  ┌──────────▼──────────────────────────────────┐
│  GROQ AI SERVICE    │  │  DATABASE SERVICE                           │
│  groq_service.py    │  │  db_service.py                              │
│                     │  │                                             │
│  CREATE Framework   │  │  PostgreSQL + pgvector                      │
│  + Chain-of-Thought │  │  • governance_kb  (20 case studies)         │
│  + KB context inject│←─┤  • response_cache (TTL 2-6h)               │
│  + Model routing    │  │  • district_analytics (time-series)         │
│    (8B / 70B)       │  │  • HNSW index for ANN search                │
└─────────────────────┘  └─────────────────────────────────────────────┘
```

---

## ⏰ 4-Hour Content Refresh Scheduler

The scheduler runs **inside the Flask process** using APScheduler's `BackgroundScheduler`:

```
App Boot
   │
   ▼
DBService() → init pgvector schema → seed 20 KB records
   │
   ▼
GroqService(db_service=db) → vector search + caching enabled
   │
   ▼
start_scheduler() → APScheduler every 4 hours (Asia/Kolkata)
   │
   ▼
run_all_refreshes()
   ├─ refresh_news()        → bumps high-priority dates to today
   ├─ refresh_districts()   → drifts scores ±3 pts, re-derives mood/trend
   ├─ refresh_polls()       → increments response counts
   └─ refresh_alerts()      → updates critical timestamps
```

---

## 🚀 How to Run

### Option 1 — Double-click (Easiest)
```
Double-click  start.bat
```
This automatically starts the Flask server and opens the dashboard in your browser.

---

### Option 2 — Manual (PowerShell)

**Step 1: Navigate to project**
```powershell
cd "C:\Users\Ranjit\Desktop\war\cm"
```

**Step 2: Activate the virtual environment**
```powershell
.\.venv\Scripts\Activate.ps1
```

**Step 3: Install dependencies (first time only)**
```powershell
pip install -r backend/requirements.txt
```
> ⚠️ `sentence-transformers` downloads a ~470 MB multilingual model on first run. This is a one-time download cached in `~/.cache/huggingface/`.

**Step 4: Configure environment**
```powershell
# Create .env in project root
echo GROQ_API_KEY=gsk_your_key_here > .env
```

**Step 5: Start the server**
```powershell
cd backend
python app.py
```

**Step 6: Open browser**
```
http://localhost:5000
```

---

### 🐛 Debug Mode

Debug mode enables hot-reload on code changes and detailed error tracebacks.

#### Method 1 — Environment Variable (Recommended)

```powershell
# PowerShell
cd "C:\Users\Ranjit\Desktop\war\cm"
.\.venv\Scripts\Activate.ps1
$env:FLASK_DEBUG = "true"
$env:FLASK_APP = "app.py"
cd backend
python app.py
```

#### Method 2 — .env File

Add to your `.env` file in the project root:
```env
GROQ_API_KEY=gsk_your_key_here
FLASK_DEBUG=true
```
Then run normally:
```powershell
cd backend ; python app.py
```

#### Method 3 — Direct Python Flag

```powershell
cd "C:\Users\Ranjit\Desktop\war\cm\backend"
python -c "
import os
os.environ['FLASK_DEBUG'] = 'true'
from app import app
app.run(debug=True, port=5000, host='0.0.0.0')
"
```

#### Debug Mode Features

| Feature | Normal Mode | Debug Mode |
|---|---|---|
| Auto-reload on code change | ❌ | ✅ |
| Detailed error traceback | ❌ | ✅ |
| Interactive debugger in browser | ❌ | ✅ |
| DB connection logs | INFO | DEBUG |
| Groq API logs | INFO | DEBUG |

#### Debug Mode Logs to Watch

```
[DB] Vector search enabled with paraphrase-multilingual-MiniLM-L12-v2
[DB] Schema ready
[DB] Knowledge base seeded with 20 records
[Groq] Cache hit: alerts/te (key a3f2...)   ← PostgreSQL cache working
[Groq] Chat error (model=llama-3.3-70b-versatile): ...  ← Groq API issues
[DB] search_relevant_cases error: ...  ← pgvector query issues
```

#### Verify Database Connection

```powershell
# Test PostgreSQL connection from Python
cd "C:\Users\Ranjit\Desktop\war\cm\backend"
python -c "
from db_service import DBService
db = DBService()
print('DB Available:', db._available)
cases = db.search_relevant_cases('water scarcity district', top_k=2)
print('KB search result:', [c['title'] for c in cases])
db.close()
"
```

Expected output:
```
[DB] Vector search enabled with paraphrase-multilingual-MiniLM-L12-v2
[DB] Schema ready
[DB] Knowledge base already has 20 records — skipping seed
DB Available: True
KB search result: ['Kerala Jal Jeevan Mission – Mobile Water ATMs', 'Rajasthan Mukhyamantri Jal Swavlamban Abhiyan']
```

#### Fallback Behavior (No DB / No Embeddings)

The system degrades gracefully:

| Component | Available | Not Available |
|---|---|---|
| PostgreSQL connection | Vector search + caching | Falls back to direct Groq calls |
| sentence-transformers | Semantic (cosine) search | PostgreSQL full-text search |
| Groq API key | Full AI features | Static fallback responses |

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/news` | All news (filter by `?category=`) |
| POST | `/api/news/summarize` | AI Telugu summary (CREATE: journalist persona) |
| GET | `/api/news/brief` | AI 1-minute daily briefing (CREATE: CMO brief persona) |
| GET | `/api/districts` | All 33 districts data |
| GET | `/api/districts/<name>` | District + AI summary (CREATE: DIB officer persona) |
| GET | `/api/polls` | Public opinion polls |
| POST | `/api/sentiment/insight` | AI sentiment insight (CREATE: political analyst persona) |
| GET | `/api/governance/suggestions` | AI suggestions (CREATE + CoT + pgvector KB) |
| POST | `/api/analyze` | Deep analysis (CREATE + CoT + 70B + pgvector + cache) |
| GET | `/api/alerts` | All red alerts |
| GET | `/api/impact` | Before/After impact tracker |
| GET | `/api/memory` | Saved issues |
| POST | `/api/memory` | Add new issue |
| POST | `/api/memory/<id>/resolve` | Mark issue resolved |
| POST | `/api/voice/query` | Voice/text → Telugu AI (CREATE: Principal Secretary) |
| POST | `/api/tts` | Text-to-speech (Telugu/English audio stream) |
| POST | `/api/refresh` | Manual data refresh |
| GET | `/api/scheduler/status` | Scheduler health + next run time |
| GET | `/health` | App health check |

---

## 🗄️ Database Schema

### PostgreSQL Tables (auto-created on startup)

```sql
-- Governance knowledge base with 384-dim embeddings
governance_kb (id, category, title, description, solution, source_state, year, outcome, embedding vector(384))

-- Response cache with TTL
response_cache (id, cache_key UNIQUE, context_type, lang, response_json, hits, created_at, expires_at)

-- District sentiment time-series
district_analytics (id, district_name, sentiment_score, mood, key_issues TEXT[], recorded_at)
```

### Knowledge Base Categories

`water` · `healthcare` · `roads` · `agriculture` · `education` · `law_order` · `disaster` · `employment` · `electricity` · `governance` · `migration` · `nutrition` · `urban`

---

## 🔑 Configuration

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | Groq API key from console.groq.com/keys |
| `FLASK_DEBUG` | No | Set `true` for debug mode (hot-reload + tracebacks) |
| `GROQ_EXPERT_MODEL` | No | Default: `llama-3.3-70b-versatile` |
| `GROQ_FAST_MODEL` | No | Default: `llama-3.1-8b-instant` |
| `PORT` | No | Default: `5000` (or `80` in Docker) |

Create `.env` in project root:
```env
GROQ_API_KEY=gsk_your_key_here
FLASK_DEBUG=false
# Optional overrides:
# GROQ_EXPERT_MODEL=llama-3.1-70b-versatile
# GROQ_FAST_MODEL=llama-3.1-8b-instant
```

---

## 📁 Folder Structure

```
cm/
├── start.bat                  ← Double-click to launch everything
├── .env                       ← GROQ_API_KEY + FLASK_DEBUG (create this)
├── backend/
│   ├── app.py                 ← Flask API server (15+ REST endpoints)
│   ├── groq_service.py        ← All Groq AI calls (CREATE framework)
│   ├── db_service.py          ← PostgreSQL + pgvector service
│   ├── scheduler.py           ← APScheduler 4-hour refresh
│   ├── build_alerts.py        ← Alert data builder
│   ├── requirements.txt       ← Python dependencies
│   └── data/
│       ├── news.json          ← 12 Telangana news items
│       ├── districts.json     ← 33 districts with coordinates & scores
│       ├── polls.json         ← Public opinion polls
│       ├── alerts.json        ← Red alerts
│       ├── impact.json        ← Before/after impact tracker
│       ├── memory.json        ← Saved issues & reminders
│       └── governance.json    ← Fallback AI suggestions
└── frontend/
    ├── index.html             ← Single-page app
    ├── css/styles.css         ← UI, glassmorphism, animations
    └── js/main.js             ← All JS: API calls, charts, voice
```

---

## 🚀 Deploy on EasyPanel / Docker

### Environment Variables (EasyPanel)
```
GROQ_API_KEY=gsk_your_actual_key_here
FLASK_DEBUG=false
```

### Docker Compose (local testing)
```bash
cp .env.example .env      # then edit and set GROQ_API_KEY
docker compose up --build
# Open: http://localhost:5000
```

> **Note on sentence-transformers in Docker**: The first build downloads a ~470 MB model. Add a `RUN pip install sentence-transformers` step to your `Dockerfile` before `CMD` so the model is baked into the image rather than downloaded at runtime.

### Health Check
```
GET /health
→ {"status": "ok", "timestamp": "..."}
```

---

## 📱 Browser Compatibility

| Browser | Status |
|---------|--------|
| Chrome 90+ | ✅ Full support (including voice) |
| Edge 90+ | ✅ Full support |
| Firefox | ✅ Charts & UI (limited voice) |
| Safari | ⚠️ Limited TTS support |


---

## 🖼️ Overview

This system gives a single-pane view of the entire state of Telangana across **9 intelligent tabs**, all fully functional in Telugu — text, audio, and AI responses.

---

## ✨ Features

### 1. 🏠 Dashboard (డాష్‌బోర్డ్)
- Personalized **Good Morning/Afternoon/Evening** greeting for the Chief Minister
- Live clock and Telugu date display
- At-a-glance **state stats**: Total districts, active alerts, positive news count, AI suggestions
- **Mood Donut Chart** — visual breakdown of happy/neutral/angry districts
- **7-Day Sentiment Trend Line** — track public mood over the week
- Quick news preview panel (top 5 headlines)
- Critical alert summary
- Pending memory reminders

### 2. 📰 News (వార్తలు) — AI News Briefing
- **12 real-time Telangana news cards** with:
  - 🟢 Positive / 🔴 Negative sentiment indicators
  - Category filters: Infrastructure | Politics | Public Complaints | Economy
  - **"What this means"** section (impact explanation in Telugu)
  - Per-card Telugu audio playback via browser TTS
  - **AI summarize button** — sends to Groq API for instant Telugu summary
- **Bulk AI Summary** — summarizes all visible news in one click

### 3. 📊 Public Opinion (ప్రజా అభిప్రాయం)
- **Animated poll bars** — road quality, hospital rating, governance satisfaction
- District-wise mood breakdown (happy / neutral / angry percentages)
- **7-day trend comparison** — "Last week vs today"
- District sentiment bar chart (top 8 districts)
- Total response counts from simulated social/survey data

### 4. 🤖 AI Governance Suggestions (AI సూచనలు) — KILLER FEATURE
- Powered by **Groq Llama 3.1-8B** via API
- Per-district filter — generate suggestions for any of 33 districts
- Each suggestion card shows:
  - ⚠️ **Problem** (in Telugu)
  - 📊 **Impact** (who is affected, how many)
  - 💡 **AI Suggestion** (practical, actionable, Telugu)
  - 📋 **Step-by-step action items** (2 steps each)
  - Priority level: 🔴 Critical / 🟡 Medium / 🟢 Low
- Audio playback for each suggestion
- Fallback static data when AI is unavailable

### 5. 🗺️ District Heatmap (జిల్లా మ్యాప్)
- **33 Telangana districts** plotted on SVG state map
- Color-coded circles:
  - 🟢 Green = Sentiment score 60+ (Happy)
  - 🟡 Yellow = Score 40–60 (Neutral)
  - 🔴 Red = Score < 40 (Alert)
- **Pulsing animation** on each district circle
- **Click any district** → See name, score, mood, issues, positive/negative news count
- **AI-generated Telugu summary** loaded from Groq for the clicked district
- Automatic voice readout of district status

### 6. 🚨 Red Alert System (రెడ్ అలర్ట్లు)
- **Auto-triggers on page load** if critical alerts exist — banner at top with audio
- Alert cards with severity: Critical / High / Medium
- Each alert shows:
  - Icon, Telugu description, district, timestamp
  - ⚡ Required immediate action
- **"Listen to all alerts"** button — plays full briefing in Telugu
- Alert banner dismissal button

### 7. 📈 Before vs After Impact Tracker (ప్రభావ ట్రాకర్)
- Track sentiment improvement after government schemes
- **Animated comparison bars** — before score (red) → after score (green)
- Shows: scheme name, district, beneficiaries, cost, launch date
- Improvement percentage chip (e.g., `+37% ↑`)
- Telugu feedback quote for each scheme
- Schemes included: Metro Phase 1, Road Repair, Textile Industry Support

### 8. 🧠 Memory System (జ్ఞాపక వ్యవస్థ)
- **Add any issue/priority** via form — saves with district, priority, description
- Auto-generates Telugu follow-up reminders
- Tracks days pending for each open issue
- Reminder message format: *"మీరు 5 రోజుల క్రితం చెప్పిన సమస్య ఇంకా పరిష్కారం కాలేదు"*
- **Resolve button** — marks issues as resolved
- Priority indicators: 🔴 High (pulsing) / 🟡 Medium / 🟢 Low

### 9. 🎤 Voice AI (వాయిస్ AI)
- Tap the **microphone orb** → speak in Telugu/English → get Telugu response
- OR type a query in text box → AI answers in Telugu
- Powered by **Groq Llama 3.1-8B**
- Conversational chat UI (bubbles with speaker buttons)
- Suggested queries chip bar:
  - *"Warangal situation enti?"*
  - *"Nizamabad water problem?"*
  - *"నేటి top 3 సమస్యలు"*
- Audio playback on every AI response

### 🎙️ 1-Minute Daily Brief Button
- One-click button in the top bar
- Groq generates a 60-second Telugu morning briefing covering:
  - Top news, public mood, key alerts, AI suggestion
- Auto-plays as audio

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla HTML5 + CSS3 + JavaScript (SPA) |
| **Charts** | Chart.js 4.4 |
| **Icons** | Font Awesome 6.5 |
| **Fonts** | Google Fonts — Noto Sans Telugu + Inter |
| **Backend** | Python 3.12 + Flask 3.0 |
| **AI** | Groq API — Llama 3.1-8B-Instant |
| **CORS** | Flask-CORS |
| **TTS** | gTTS (Google Text-to-Speech, server-side) + Web Speech API (browser-native fallback) |
| **Scheduler** | APScheduler 3.x — BackgroundScheduler |
| **Production Server** | Gunicorn (WSGI) |
| **Container** | Docker / EasyPanel |

---

## 🏗️ How the Solution Works — Architecture Deep Dive

### Separation of Concerns (Work Segregation)

The system is split into four distinct layers, each with a single responsibility:

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER  (Presentation Layer)                              │
│  index.html + css/styles.css + js/main.js                   │
│  • Renders 9 tab panels as a Single Page App                │
│  • All API calls go through fetchJSON() → /api/* endpoints  │
│  • Auto-refreshes every 4 hours via startAutoRefresh()      │
└───────────────────────┬─────────────────────────────────────┘
                        │  HTTP (REST JSON)
┌───────────────────────▼─────────────────────────────────────┐
│  FLASK API SERVER  (Routing + Orchestration Layer)          │
│  backend/app.py                                             │
│  • 14 REST endpoints — each one maps to one UI feature      │
│  • Serves the frontend static files (no separate web server)│
│  • Delegates AI work to groq_service.py                     │
│  • Delegates data reads/writes to JSON files in data/       │
│  • Starts the background scheduler on boot                  │
└───────┬───────────────────────────┬─────────────────────────┘
        │                           │
┌───────▼──────────┐   ┌────────────▼────────────────────────┐
│  AI SERVICE      │   │  SCHEDULER  (Background Layer)      │
│  groq_service.py │   │  scheduler.py                        │
│                  │   │                                      │
│  • Wraps every   │   │  • APScheduler BackgroundScheduler   │
│    Groq LLM call │   │  • Runs inside the same process      │
│  • Formats       │   │  • Every 4 hours:                    │
│    Telugu prompts│   │    ① refresh_news()    — bump dates  │
│  • JSON parsing  │   │    ② refresh_districts() — drift     │
│  • Error fallback│   │       sentiment scores ±3 pts        │
└──────────────────┘   │    ③ refresh_polls()   — grow        │
                       │       response counts                │
                       │    ④ refresh_alerts()  — update      │
                       │       critical timestamps            │
                       └─────────────────────────────────────┘
```

### Data Flow per User Action

| User Action | Frontend | API Endpoint | Backend Work |
|---|---|---|---|
| Page load | `loadAllData()` | `GET /api/news`, `/districts`, etc. | Read 6 JSON files in parallel |
| Click "AI Summary" on news | `summarizeNews()` | `POST /api/news/summarize` | groq_service → Llama → Telugu text |
| Click district on map | `loadDistrictDetail()` | `GET /api/districts/<name>` | Read JSON + Groq district summary |
| Type in Voice AI | `sendVoiceQuery()` | `POST /api/voice/query` | Groq open-ended Telugu Q&A |
| Listen button | `playTTS()` | `POST /api/tts` | gTTS → MP3 audio stream |
| Every 4 hours (auto) | `startAutoRefresh()` | — | Client reloads all endpoints |
| Every 4 hours (backend) | — | `GET /api/scheduler/status` | APScheduler rewrites JSON files |

### How the 9 Tabs Are Segregated

Each tab is a self-contained feature slice — no tab depends on the internals of another:

| Tab | Frontend Render Function | API Dependency | AI? |
|---|---|---|---|
| Dashboard | `renderDashboard()` | news + districts + alerts + memory | No (shows cached data) |
| News | `renderNews()` | `/api/news` + `/api/news/summarize` | ✅ Per-card & bulk summary |
| Public Opinion | `renderPolls()` | `/api/polls` + `/api/sentiment/insight` | ✅ Insight per district |
| AI Suggestions | `loadGovernanceSuggestions()` | `/api/governance/suggestions` | ✅ Llama 3.1 suggestions |
| District Heatmap | `renderDistrictMap()` | `/api/districts/<name>` | ✅ Per-district summary |
| Red Alerts | `renderAlerts()` | `/api/alerts` | No |
| Impact Tracker | `renderImpact()` | `/api/impact` | No |
| Memory System | `renderMemory()` | `/api/memory` (GET/POST) | No |
| Voice AI | `sendVoiceQuery()` | `/api/voice/query` | ✅ Full conversational AI |

---

## ⏰ 4-Hour Content Refresh Scheduler

### How It Works

The scheduler runs **inside the Flask process** using APScheduler's `BackgroundScheduler` — no cron jobs or extra containers needed.

```
App Boot
   │
   ▼
start_scheduler() called in app.py (module level)
   │
   ├─► Immediate first refresh (background thread, 0-delay)
   │
   └─► APScheduler interval trigger: every 4 hours (Asia/Kolkata timezone)
           │
           ▼
        run_all_refreshes()
           ├─ refresh_news()        → bumps high-priority news dates to today
           ├─ refresh_districts()   → drifts each district score ±3 pts,
           │                          re-derives mood/trend labels
           ├─ refresh_polls()       → increments response counts (50–200/cycle),
           │                          nudges ratings ±0.1
           └─ refresh_alerts()      → updates critical alert timestamps
```

### Frontend Auto-Refresh

Every browser session also reloads all data every 4 hours independently:

```javascript
// main.js — startAutoRefresh()
setInterval(async () => {
  await loadAllData();          // re-fetches all 6 API endpoints
  state.govSuggestions = [];    // forces AI suggestions to regenerate on next visit
  showToast("🔄 కంటెంట్ అప్‌డేట్ అయింది");
}, 4 * 60 * 60 * 1000);
```

### Check Scheduler Status

```
GET /api/scheduler/status
```
```json
{
  "running": true,
  "refresh_interval_hours": 4,
  "last_refresh": "2026-04-30T06:00:00+05:30",
  "next_refresh": "2026-04-30T10:00:00+05:30",
  "cycles_completed": 3
}
```

---

## 🚀 Deploy on EasyPanel

EasyPanel (easypanel.io) deploys Docker containers directly from a Git repository or uploaded source.

### Step-by-step

**1. Push your code to a Git repository** (GitHub / GitLab / Gitea)

**2. In EasyPanel → Create App → Source: Git Repo**
- Repository URL: `https://github.com/your-user/telangana-governance`
- Branch: `main`
- Build method: `Dockerfile` (auto-detected from `Dockerfile` in repo root)

**3. Set Environment Variables** in EasyPanel → App → Environment:
```
GROQ_API_KEY=gsk_your_actual_key_here
FLASK_DEBUG=false
```

Do not set `PORT` in EasyPanel unless you also change the app's internal port mapping. The Docker image defaults to `PORT=80`, which matches EasyPanel's `http://your_app:80/` routing.

**4. Configure the Domain**
- EasyPanel → App → Domains → Add domain (e.g. `governance.telangana.gov.in`)
- Enable HTTPS (EasyPanel handles Let's Encrypt automatically)

**5. Deploy** — EasyPanel builds the Docker image and starts the container.

**6. Verify health check**
```
https://your-domain.com/health
```
Should return `{"status": "ok", "timestamp": "..."}`.

### EasyPanel Persistent Storage (important for scheduler writes)

The scheduler writes updated JSON back to `backend/data/`. In EasyPanel, mount a **volume** so data survives container restarts:

- EasyPanel → App → Volumes → Add Volume
  - Container path: `/app/backend/data`
  - Host path: `data` (EasyPanel manages the host path)

### Docker Compose (local testing before EasyPanel)

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env and set GROQ_API_KEY

# Build and run
docker compose up --build

# Open browser
# http://localhost:5000
```

---
| **STT** | Web Speech Recognition API |
| **Animations** | CSS keyframes + Canvas particles |

---

## 📁 Folder Structure

```
cm/
├── start.bat                  ← Double-click to launch everything
├── STRUCTURE.txt
├── .venv/                     ← Python virtual environment
├── backend/
│   ├── app.py                 ← Flask API server (9 REST endpoints)
│   ├── groq_service.py        ← All Groq AI interactions
│   ├── requirements.txt       ← Python dependencies
│   └── data/
│       ├── news.json          ← 12 Telangana news items
│       ├── districts.json     ← 33 districts with coordinates & scores
│       ├── polls.json         ← 3 public opinion polls
│       ├── alerts.json        ← 5 red alerts
│       ├── impact.json        ← 3 before/after impact schemes
│       ├── memory.json        ← Saved issues & reminders
│       └── governance.json    ← Fallback AI suggestions
└── frontend/
    ├── index.html             ← Main single-page app
    ├── css/
    │   └── styles.css         ← Full UI, glassmorphism, animations
    └── js/
        └── main.js            ← All JS logic, API calls, charts, voice
```

---

## 🚀 How to Run

### Option 1 — Double-click (Easiest)
```
Double-click  start.bat
```
This will automatically start the Flask server and open the dashboard in your browser.

---

### Option 2 — Manual (PowerShell)

**Step 1: Navigate to project**
```powershell
cd "C:\Users\Ranjit\Desktop\war\cm"
```

**Step 2: Activate the virtual environment**
```powershell
.\.venv\Scripts\Activate.ps1
```

**Step 3: Install dependencies (first time only)**
```powershell
pip install flask flask-cors groq python-dotenv
```

**Step 4: Start the server**
```powershell
cd backend
python app.py
```

**Step 5: Open browser**
```
http://localhost:5000
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/news` | All news (filter by `?category=`) |
| POST | `/api/news/summarize` | AI Telugu summary for any text |
| GET | `/api/news/brief` | AI 1-minute daily briefing |
| GET | `/api/districts` | All 33 districts data |
| GET | `/api/districts/<name>` | Single district with AI summary |
| GET | `/api/polls` | Public opinion polls |
| POST | `/api/sentiment/insight` | AI sentiment insight for district |
| GET | `/api/governance/suggestions` | AI suggestions (filter by `?district=`) |
| GET | `/api/alerts` | All red alerts |
| GET | `/api/impact` | Before/After impact tracker data |
| GET | `/api/memory` | Saved issues |
| POST | `/api/memory` | Add new issue |
| POST | `/api/memory/<id>/resolve` | Mark issue as resolved |
| POST | `/api/voice/query` | Voice/text query → Telugu AI response |

---

## 🔑 AI Configuration

The app uses **Groq API** with **Llama 3.1-8B-Instant** model.

The API key is read from the `GROQ_API_KEY` environment variable.

Get your free key at: https://console.groq.com/keys

For local development, create a `.env` file in the project root:
```
GROQ_API_KEY=your_groq_api_key_here
```

For EasyPanel / Docker, set it as an environment variable (see deployment section).

---

## 🎨 UI Design Highlights

- **Dark glassmorphism** design — deep navy background with frosted glass cards
- **Particle canvas** background — animated floating dots with connections
- **Animated loading screen** with tri-ring spinner
- **Smooth tab transitions** with fade-up animations
- **Responsive** — works on tablets and desktops
- **Sidebar** with collapse/expand toggle
- **Animated audio waveform** bar when Telugu TTS is playing
- All text in **Noto Sans Telugu** font

---

## 🔊 Telugu Audio

The app uses the browser's built-in **Web Speech API** for text-to-speech.

For best Telugu audio quality:
- **Chrome** on Windows with Telugu language pack installed gives the most natural voice
- The app automatically selects the Telugu voice if available (`te-IN`)
- Falls back to default voice if Telugu is not installed

To install Telugu voice on Windows:
> Settings → Time & Language → Language → Add Telugu → Download speech pack

---

## 📱 Browser Compatibility

| Browser | Status |
|---------|--------|
| Chrome 90+ | ✅ Full support (including voice) |
| Edge 90+ | ✅ Full support |
| Firefox | ✅ Charts & UI (limited voice) |
| Safari | ⚠️ Limited TTS support |
