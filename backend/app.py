from flask import Flask, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
import json
import os
import io
import hashlib
from collections import OrderedDict
from datetime import datetime
from groq_service import GroqService
from db_service import DBService
from gtts import gTTS
from scheduler import start_scheduler, stop_scheduler, get_status as scheduler_status
import atexit

# Simple in-memory TTS cache (keyed by MD5 of text, max 200 entries)
_TTS_CACHE: OrderedDict = OrderedDict()
_TTS_CACHE_MAX = 200
import logging
import time

logging.basicConfig(level=logging.INFO)

app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)

# Initialize PostgreSQL + pgvector service first, then pass to Groq for KB context and caching
db = DBService()
groq = GroqService(db_service=db)

# Start the scheduler here so it works under both `python app.py`
# AND gunicorn (which never reaches __main__).
# guard prevents double-start when Flask debug reloader spawns a child.
if not os.environ.get("WERKZEUG_RUN_MAIN"):
    start_scheduler()
    atexit.register(stop_scheduler)
    atexit.register(db.close)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    for attempt in range(3):
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            if content.strip():
                return json.loads(content)
        except (json.JSONDecodeError, OSError):
            pass
        if attempt < 2:
            time.sleep(0.05)
    raise ValueError(f"Could not read valid JSON from {filename} after 3 attempts")


def save_json(filename, data):
    with open(os.path.join(DATA_DIR, filename), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ─── Serve Frontend ───────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory("../frontend", "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("../frontend", path)


# ─── News ─────────────────────────────────────────────────────────────────────
@app.route("/api/news")
def get_news():
    category = request.args.get("category", "all")
    news = load_json("news.json")
    if category != "all":
        news = [n for n in news if n["category"] == category]
    return jsonify(news)


@app.route("/api/news/summarize", methods=["POST"])
def summarize_news():
    data = request.get_json()
    text = data.get("text", "")
    summary = groq.summarize_news(text)
    return jsonify({"summary": summary})


@app.route("/api/news/brief")
def daily_brief():
    brief = groq.generate_daily_brief()
    return jsonify({"brief": brief})


# ─── Districts ────────────────────────────────────────────────────────────────
@app.route("/api/districts")
def get_districts():
    return jsonify(load_json("districts.json"))


@app.route("/api/districts/<name>")
def get_district(name):
    districts = load_json("districts.json")
    district = next(
        (d for d in districts if d["name"].lower() == name.lower()), None
    )
    if not district:
        return jsonify({"error": "Not found"}), 404
    summary = groq.district_summary(district["name"], district.get("issues", []))
    district["ai_summary"] = summary
    return jsonify(district)


# ─── Polls / Sentiment ────────────────────────────────────────────────────────
@app.route("/api/polls")
def get_polls():
    return jsonify(load_json("polls.json"))


@app.route("/api/sentiment/insight", methods=["POST"])
def sentiment_insight():
    data = request.get_json()
    insight = groq.sentiment_insight(
        data.get("district", ""),
        data.get("sentiment", ""),
        data.get("score", 50),
    )
    return jsonify({"insight": insight})


# ─── Governance Suggestions ───────────────────────────────────────────────────
@app.route("/api/governance/suggestions")
def get_suggestions():
    district = request.args.get("district", "")
    suggestions = groq.get_governance_suggestions(district)
    # Fall back to static suggestions if AI fails or returns empty
    if not suggestions:
        suggestions = load_json("governance.json")
    return jsonify(suggestions)


# ─── Alerts ───────────────────────────────────────────────────────────────────
@app.route("/api/alerts")
def get_alerts():
    return jsonify(load_json("alerts.json"))


# ─── AI Analysis & Resolution ─────────────────────────────────────────────────
@app.route("/api/analyze", methods=["POST"])
def analyze_and_resolve():
    data = request.get_json()
    context_type = data.get("type", "alerts")   # alerts | districts | news | governance
    items        = data.get("items", [])
    lang         = data.get("lang", "te")          # "te" (Telugu) or "en" (English)

    # Build a compact summary string to stay within token limits
    if context_type == "alerts":
        lines = [f"[{a.get('severity','').upper()}] {a.get('title','')} — {a.get('district','')} — Action: {a.get('action_required','')}"
                 for a in items[:20]]
    elif context_type == "districts":
        lines = [f"{d.get('name','')} score={d.get('score','')} mood={d.get('mood','')} trend={d.get('trend','')} issues={','.join(d.get('issues',[]))}"
                 for d in items[:33]]
    elif context_type == "news":
        lines = [f"[{n.get('sentiment','').upper()}] {n.get('title','')} — {n.get('district','')} — {n.get('category','')}"
                 for n in items[:20]]
    else:  # governance
        lines = [f"Problem: {s.get('problem_telugu','')} | Priority: {s.get('priority','')}"
                 for s in items[:10]]

    summary = "\n".join(lines) if lines else "No data available."
    result = groq.analyze_and_resolve(context_type, summary, lang)
    return jsonify(result)


# ─── Impact Tracker ───────────────────────────────────────────────────────────
@app.route("/api/impact")
def get_impact():
    return jsonify(load_json("impact.json"))


# ─── Policies ─────────────────────────────────────────────────────────────────
@app.route("/api/policies")
def get_policies():
    sort_by = request.args.get("sort", "influence")  # "influence" | "beneficiaries"
    policies = load_json("policies.json")
    if sort_by == "beneficiaries":
        policies = sorted(policies, key=lambda p: p.get("beneficiaries_millions", 0), reverse=True)
    else:
        policies = sorted(policies, key=lambda p: p.get("influence_score", 0), reverse=True)
    return jsonify(policies)

@app.route("/api/state-policies")
def get_state_policies():
    sort_by = request.args.get("sort", "influence")   # "influence" | "beneficiaries" | "year"
    state   = request.args.get("state", "")
    party   = request.args.get("party", "")
    policies = load_json("state_policies.json")
    if state:
        policies = [p for p in policies if p.get("state") == state]
    if party:
        policies = [p for p in policies if p.get("party") == party]
    if sort_by == "beneficiaries":
        policies = sorted(policies, key=lambda p: p.get("beneficiaries_millions", 0), reverse=True)
    elif sort_by == "year":
        policies = sorted(policies, key=lambda p: p.get("year", 0), reverse=True)
    else:
        policies = sorted(policies, key=lambda p: p.get("influence_score", 0), reverse=True)
    return jsonify(policies)


# ─── Memory System ────────────────────────────────────────────────────────────
@app.route("/api/memory")
def get_memory():
    return jsonify(load_json("memory.json"))


@app.route("/api/memory", methods=["POST"])
def add_memory():
    data = request.get_json()
    memory = load_json("memory.json")
    new_item = {
        "id": len(memory) + 1,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "status": "open",
        **data,
    }
    memory.insert(0, new_item)
    save_json("memory.json", memory)
    return jsonify({"success": True, "item": new_item})


@app.route("/api/memory/<int:item_id>/resolve", methods=["POST"])
def resolve_memory(item_id):
    memory = load_json("memory.json")
    for item in memory:
        if item["id"] == item_id:
            item["status"] = "resolved"
            break
    save_json("memory.json", memory)
    return jsonify({"success": True})


# ─── Voice Query ─────────────────────────────────────────────────────────────
@app.route("/api/voice/query", methods=["POST"])
def voice_query():
    data = request.get_json()
    query = data.get("query", "")
    response = groq.answer_query(query)
    return jsonify({"response": response})


# ─── Telugu TTS (Google gTTS) ─────────────────────────────────────────────────
@app.route("/api/tts", methods=["POST"])
def tts():
    data = request.get_json()
    text = data.get("text", "").strip()
    lang = data.get("lang", "te")  # "te" (Telugu) or "en" (English)
    if not text:
        return jsonify({"error": "No text provided"}), 400
    # Truncate to 300 chars to limit the number of gTTS chunks (each chunk = 1 HTTP call)
    if len(text) > 300:
        text = text[:300].rsplit(" ", 1)[0]
    cache_key = hashlib.md5(f"{lang}:{text}".encode("utf-8")).hexdigest()
    if cache_key in _TTS_CACHE:
        # Return cached audio immediately
        _TTS_CACHE.move_to_end(cache_key)
        return send_file(io.BytesIO(_TTS_CACHE[cache_key]), mimetype="audio/mpeg",
                         as_attachment=False, download_name="tts.mp3")
    try:
        tts_obj = gTTS(text=text, lang=lang, slow=False)
        buf = io.BytesIO()
        tts_obj.write_to_fp(buf)
        audio_bytes = buf.getvalue()
        # Store in cache
        _TTS_CACHE[cache_key] = audio_bytes
        if len(_TTS_CACHE) > _TTS_CACHE_MAX:
            _TTS_CACHE.popitem(last=False)
        return send_file(io.BytesIO(audio_bytes), mimetype="audio/mpeg",
                         as_attachment=False, download_name="tts.mp3")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── Manual Refresh (triggered by the frontend Refresh button) ────────────────
@app.route("/api/refresh", methods=["POST"])
def manual_refresh():
    """
    Immediately run the full scheduler refresh cycle.
    Called by the frontend Refresh button so users get up-to-date data
    without waiting for the 4-hour automatic cycle.
    """
    try:
        from scheduler import run_all_refreshes
        run_all_refreshes()
        return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})
    except Exception as e:
        logging.error("Manual refresh error: %s", e)
        return jsonify({"status": "error", "message": str(e)}), 500


# ─── Scheduler Status ─────────────────────────────────────────────────────────
@app.route("/api/scheduler/status")
def get_scheduler_status():
    return jsonify(scheduler_status())


# ─── Health Check (EasyPanel / Docker) ───────────────────────────────────────
@app.route("/health")
def health():
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug, port=port, host="0.0.0.0")
