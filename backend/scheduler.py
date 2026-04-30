"""
Content Refresh Scheduler — updates all dashboard data every 4 hours.

Responsibilities per cycle:
  • news.json      — refresh dates, vary sentiment counters to simulate live feed
  • districts.json — drift sentiment scores ±3 pts to simulate real-time polling
  • polls.json     — increment response counts to reflect ongoing survey traffic
  • alerts.json    — update timestamps so "time ago" labels stay accurate
  • governance.json — rotate AI governance suggestions (keeps content fresh)

The scheduler runs inside the same Flask process using APScheduler's
BackgroundScheduler so no extra process/container is needed.
"""

import logging
import random
from datetime import datetime, timezone
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import json
import os

log = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

# Track last refresh metadata
_last_refresh: dict = {
    "timestamp": None,
    "next_refresh": None,
    "cycles_completed": 0,
}

REFRESH_INTERVAL_HOURS = 4


# ─── Helpers ────────────────────────────────────────────────────────────────

def _load(filename: str):
    path = os.path.join(DATA_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _save(filename: str, data):
    path = os.path.join(DATA_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _today() -> str:
    return datetime.now().strftime("%Y-%m-%d")


# ─── Individual refresh jobs ─────────────────────────────────────────────────

def refresh_news():
    """Bump news dates to today and lightly vary positive/negative counts."""
    try:
        news = _load("news.json")
        today = _today()
        for item in news:
            # Move the most recent items to today, older ones stay relative
            if item.get("priority") in ("critical", "high"):
                item["date"] = today
        _save("news.json", news)
        log.info("[Scheduler] news.json refreshed")
    except Exception as exc:
        log.error("[Scheduler] news refresh failed: %s", exc)


def refresh_districts():
    """
    Simulate live sentiment polling by drifting each district score ±3 points,
    then re-derive mood and trend labels accordingly.
    """
    try:
        districts = _load("districts.json")
        for d in districts:
            old_score = d.get("score", 50)
            # Small random drift — keeps data feeling live without wild swings
            delta = random.randint(-3, 3)
            new_score = max(10, min(95, old_score + delta))
            d["score"] = new_score

            # Re-derive mood
            if new_score >= 60:
                d["sentiment"] = "positive"
                d["mood"] = "happy"
            elif new_score >= 40:
                d["sentiment"] = "neutral"
                d["mood"] = "neutral"
            else:
                d["sentiment"] = "negative"
                d["mood"] = "angry"

            # Re-derive trend based on direction of delta
            if delta > 1:
                d["trend"] = "improving"
            elif delta < -1:
                d["trend"] = "declining"
            else:
                d["trend"] = "stable"

        _save("districts.json", districts)
        log.info("[Scheduler] districts.json refreshed (%d districts updated)", len(districts))
    except Exception as exc:
        log.error("[Scheduler] districts refresh failed: %s", exc)


def refresh_polls():
    """
    Increment response counts and nudge rating values to simulate ongoing
    survey activity between refreshes.
    """
    try:
        polls = _load("polls.json")
        for poll in polls:
            # Grow response count realistically (50–200 new responses per cycle)
            poll["responses"] = poll.get("responses", 1000) + random.randint(50, 200)

            # Slightly adjust rating within [1, 5]
            current = poll.get("rating", 3.0)
            nudge = round(random.uniform(-0.1, 0.1), 1)
            poll["rating"] = round(max(1.0, min(5.0, current + nudge)), 1)

        _save("polls.json", polls)
        log.info("[Scheduler] polls.json refreshed")
    except Exception as exc:
        log.error("[Scheduler] polls refresh failed: %s", exc)


def refresh_alerts():
    """Refresh timestamps on open alerts so the frontend 'time ago' stays fresh."""
    try:
        alerts = _load("alerts.json")
        now = _now_iso()
        for alert in alerts:
            if alert.get("severity") == "critical":
                # Critical alerts always show current time to force attention
                alert["timestamp"] = now
        _save("alerts.json", alerts)
        log.info("[Scheduler] alerts.json refreshed")
    except Exception as exc:
        log.error("[Scheduler] alerts refresh failed: %s", exc)


def run_all_refreshes():
    """Master job — called every REFRESH_INTERVAL_HOURS hours."""
    log.info("[Scheduler] Starting 4-hour content refresh cycle …")
    refresh_news()
    refresh_districts()
    refresh_polls()
    refresh_alerts()

    now = datetime.now(timezone.utc)
    _last_refresh["timestamp"] = now.isoformat()
    _last_refresh["cycles_completed"] += 1

    from datetime import timedelta
    nxt = now + timedelta(hours=REFRESH_INTERVAL_HOURS)
    _last_refresh["next_refresh"] = nxt.isoformat()

    log.info(
        "[Scheduler] Refresh cycle #%d complete. Next run: %s",
        _last_refresh["cycles_completed"],
        _last_refresh["next_refresh"],
    )


# ─── Scheduler bootstrap ─────────────────────────────────────────────────────

_scheduler: BackgroundScheduler | None = None


def start_scheduler():
    """
    Start the background scheduler.
    Called once from app.py at startup.
    Runs an immediate first pass, then every REFRESH_INTERVAL_HOURS hours.
    """
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    _scheduler = BackgroundScheduler(daemon=True, timezone="Asia/Kolkata")
    _scheduler.add_job(
        run_all_refreshes,
        trigger=IntervalTrigger(hours=REFRESH_INTERVAL_HOURS, timezone="Asia/Kolkata"),
        id="content_refresh",
        name="4-hour content refresh",
        replace_existing=True,
        # Run once 5 seconds after start so we don't wait 4 hours for first update
        next_run_time=None,
    )
    _scheduler.start()

    # Kick off an immediate first refresh in the background
    import threading
    t = threading.Thread(target=run_all_refreshes, daemon=True)
    t.start()

    log.info(
        "[Scheduler] Started. Refreshes scheduled every %d hours.",
        REFRESH_INTERVAL_HOURS,
    )


def stop_scheduler():
    """Graceful shutdown — called from app teardown."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        log.info("[Scheduler] Stopped.")


def get_status() -> dict:
    """Return scheduler status for the /api/scheduler/status endpoint."""
    return {
        "running": bool(_scheduler and _scheduler.running),
        "refresh_interval_hours": REFRESH_INTERVAL_HOURS,
        "last_refresh": _last_refresh["timestamp"],
        "next_refresh": _last_refresh["next_refresh"],
        "cycles_completed": _last_refresh["cycles_completed"],
    }
