from flask import Flask, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
import json
import os
import io
from datetime import datetime
from groq_service import GroqService
from gtts import gTTS
from scheduler import start_scheduler, stop_scheduler, get_status as scheduler_status
import atexit
import logging

logging.basicConfig(level=logging.INFO)

app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)

groq = GroqService()

# Start the scheduler here so it works under both `python app.py`
# AND gunicorn (which never reaches __main__).
# guard prevents double-start when Flask debug reloader spawns a child.
if not os.environ.get("WERKZEUG_RUN_MAIN"):
    start_scheduler()
    atexit.register(stop_scheduler)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def load_json(filename):
    with open(os.path.join(DATA_DIR, filename), "r", encoding="utf-8") as f:
        return json.load(f)


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


# ─── Impact Tracker ───────────────────────────────────────────────────────────
@app.route("/api/impact")
def get_impact():
    return jsonify(load_json("impact.json"))


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
    if not text:
        return jsonify({"error": "No text provided"}), 400
    try:
        tts_obj = gTTS(text=text, lang="te", slow=False)
        buf = io.BytesIO()
        tts_obj.write_to_fp(buf)
        buf.seek(0)
        return send_file(buf, mimetype="audio/mpeg", as_attachment=False, download_name="tts.mp3")
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
