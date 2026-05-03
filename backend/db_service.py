"""
PostgreSQL + pgvector Database Service
=======================================
Provides:
  • Semantic similarity search over a rich governance knowledge base
  • Response caching (TTL-based) for faster repeated queries
  • District analytics storage for trend analysis

Connection: postgres://kishore:kishore*123@72.61.254.168:5432/cm_suggestion?sslmode=disable
"""

import json
import logging
import os
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import psycopg2
import psycopg2.extras

log = logging.getLogger(__name__)

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgres://kishore:kishore*123@72.61.254.168:5432/cm_suggestion?sslmode=disable"
)

# ── Embedding model (optional — falls back to text search if unavailable) ─────
try:
    from sentence_transformers import SentenceTransformer
    _encoder = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    EMBEDDING_DIM = 384
    VECTOR_SEARCH = True
    log.info("[DB] Vector search enabled with paraphrase-multilingual-MiniLM-L12-v2")
except Exception as _emb_exc:
    _encoder = None
    EMBEDDING_DIM = 384
    VECTOR_SEARCH = False
    log.warning("[DB] sentence-transformers unavailable — text-search fallback active: %s", _emb_exc)


# ── Rich governance knowledge base (seeded once) ─────────────────────────────
_KB_SEED: List[Dict] = [
    {
        "category": "water",
        "title": "Kerala Jal Jeevan Mission – Mobile Water ATMs",
        "description": "Rural water scarcity drinking water shortage groundwater depletion Telangana districts",
        "solution": "500 solar-powered mobile water ATMs with IoT sensor monitoring. Each unit serves 2,000 households. 24/7 availability with SMS maintenance alerts. Community operators trained locally.",
        "source_state": "Kerala",
        "year": 2022,
        "outcome": "Water coverage rose from 45% to 89% in 18 months. 2.3 million households served. Water-borne disease incidents reduced by 67%.",
    },
    {
        "category": "water",
        "title": "Gujarat Sujalam Sufalam Water Grid",
        "description": "Inter-district water transfer irrigation shortage drought canal irrigation agricultural water",
        "solution": "2,400 km pipeline grid connecting Narmada to drought-prone districts. Smart valve control. Community-managed secondary distribution channels.",
        "source_state": "Gujarat",
        "year": 2020,
        "outcome": "23 lakh hectares irrigated. 1.2 crore farmers benefited. Crop yield up 40% in drought regions within 2 seasons.",
    },
    {
        "category": "water",
        "title": "Rajasthan Mukhyamantri Jal Swavlamban Abhiyan",
        "description": "Water conservation rainwater harvesting check dams johads groundwater recharge village water",
        "solution": "1.5 lakh water conservation structures in 3 years. Village water committees with daily monitoring. 48,000 check dams and johads restored under MGNREGS.",
        "source_state": "Rajasthan",
        "year": 2019,
        "outcome": "Groundwater level rose 3.5 feet on average. 22,000 villages became water self-sufficient. ₹5,600 crore investment yielded ₹12,000 crore agricultural improvement.",
    },
    {
        "category": "healthcare",
        "title": "Tamil Nadu Mobile Medical Units – 1,200 Fleet",
        "description": "Rural healthcare access primary health shortage maternal mortality tribal health PHC village",
        "solution": "1,200 mobile medical units covering tribal and remote areas. 24 specialties via telemedicine. Free medicines, diagnostics, and emergency referral transport.",
        "source_state": "Tamil Nadu",
        "year": 2021,
        "outcome": "Maternal mortality: 62 to 38 per lakh. 4.5 crore OPD consultations annually. Hospital admission burden reduced 25%.",
    },
    {
        "category": "healthcare",
        "title": "Maharashtra MJPJAY Universal Health Coverage",
        "description": "Healthcare insurance expensive treatment BPL families uninsured hospitalization cost health scheme",
        "solution": "972 procedures covered cashless. Treatment up to ₹2.5 lakh. 500+ empanelled hospitals. Auto-enrollment for BPL via Aadhaar linking.",
        "source_state": "Maharashtra",
        "year": 2023,
        "outcome": "1.65 crore families enrolled. ₹4,200 crore claims settled. Out-of-pocket medical expense reduced 58% for enrolled families.",
    },
    {
        "category": "healthcare",
        "title": "Karnataka Arogya Karnataka Health Scheme",
        "description": "Government hospital capacity doctor shortage specialist unavailability secondary care",
        "solution": "Hub-and-spoke model: tertiary hospitals as hubs with 50+ connected PHCs via telemedicine. Rotating specialists visit each PHC monthly.",
        "source_state": "Karnataka",
        "year": 2022,
        "outcome": "Specialist consultations in rural areas up 340%. Referral to tertiary hospitals reduced 28%. Patient travel cost saved ₹4,200/visit on average.",
    },
    {
        "category": "roads",
        "title": "Andhra Pradesh RTGS Rapid Road Repair",
        "description": "Potholes poor road quality monsoon damage rural connectivity accident fatalities road maintenance",
        "solution": "Rapid Thermal Gel Seal technology for pothole repair in 2 hours per pothole. GPS-tagged reporting app with 48-hour SLA. Automated grievance-to-engineer assignment.",
        "source_state": "Andhra Pradesh",
        "year": 2022,
        "outcome": "48,000 km repaired in 12 months. Citizen satisfaction rose from 34% to 78%. Road accident fatalities down 22%.",
    },
    {
        "category": "roads",
        "title": "Odisha CM Road Repair Emergency Brigades",
        "description": "Rural road damage flood-damaged roads PMGSY connectivity pothole repair village access",
        "solution": "Emergency repair brigades with pre-positioned material stockpiles at block level. Geo-tagged inspection with weekly CM dashboard real-time monitoring.",
        "source_state": "Odisha",
        "year": 2023,
        "outcome": "32,000 km rural roads repaired in monsoon season. Connectivity restored to 4,200 villages. Ambulance response time reduced by 35 minutes on average.",
    },
    {
        "category": "agriculture",
        "title": "Karnataka Satellite-Based Crop Insurance Settlement",
        "description": "Crop failure farmer distress drought insurance claim delay agriculture loss farmer suicide",
        "solution": "Satellite crop damage assessment eliminates physical verification. Direct bank transfer within 15 days. PM Fasal Bima enhanced with state co-contribution of 20%.",
        "source_state": "Karnataka",
        "year": 2022,
        "outcome": "Claim settlement: 6 months to 21 days. 28 lakh farmers enrolled. ₹3,200 crore paid 2022-23. Farmer suicide rate fell 31%.",
    },
    {
        "category": "agriculture",
        "title": "Punjab Smart E-Mandi MSP Direct Market",
        "description": "Low crop prices market access MSP non-compliance farmer income agricultural market procurement",
        "solution": "E-mandis with real-time price discovery. Direct government MSP procurement via Aadhaar-linked accounts. Cold storage clusters at block level with subsidy.",
        "source_state": "Punjab",
        "year": 2021,
        "outcome": "3.2 lakh farmers sold directly at MSP. Storage losses: 28% to 8%. Average farmer income increased ₹42,000/year.",
    },
    {
        "category": "agriculture",
        "title": "Madhya Pradesh Bhavantar Bhugtan Yojana Price Deficiency",
        "description": "Crop price crash MSP procurement shortfall farmer income deficiency payment agriculture",
        "solution": "Government pays the difference between MSP and actual market price directly to farmers. No intermediary. Registration via MP e-Uparjan portal.",
        "source_state": "Madhya Pradesh",
        "year": 2017,
        "outcome": "18 lakh farmers received ₹1,500 crore in price deficiency payments in first year. Distress selling reduced by 60%.",
    },
    {
        "category": "education",
        "title": "Himachal Pradesh Atal Adarsh Vidyalaya Smart Schools",
        "description": "School dropout poor infrastructure teacher shortage rural education digital learning quality",
        "solution": "Each Gram Panchayat gets one smart school with digital labs, smart boards, broadband. Performance-linked pay for locally recruited teachers. Biometric attendance with parent SMS.",
        "source_state": "Himachal Pradesh",
        "year": 2020,
        "outcome": "Dropout rate: 18% to 4.2% in 3 years. Class 10 pass rate at 94%. Digital literacy reached 89% of enrolled students.",
    },
    {
        "category": "law_order",
        "title": "Andhra Pradesh SHE Teams Women Safety Programme",
        "description": "Women harassment sexual crimes unsafe public spaces women security transport crime",
        "solution": "500 plain-clothes SHE Teams in buses and public spaces. Centralized complaint management with 24-hour SLA. AI-enabled CCTV in 15 major cities.",
        "source_state": "Andhra Pradesh",
        "year": 2014,
        "outcome": "Crimes against women down 45% in covered areas. 88% women report feeling safe in public transport. 23,000+ offenders penalized Year 1.",
    },
    {
        "category": "disaster",
        "title": "Odisha Zero Casualty Cyclone & Flood Model",
        "description": "Flood evacuation cyclone preparedness disaster response NDRF rescue relief management",
        "solution": "Pre-emptive full coastal zone evacuation. NDRF pre-positioned 72 hours before events. Multi-tier cyclone shelters with 72-hour food/medicine stockpiles.",
        "source_state": "Odisha",
        "year": 2023,
        "outcome": "Zero casualty with 1.2 million evacuated during Cyclone Biparjoy. Cited as WHO global model. Reconstruction cost down 60% vs 2013.",
    },
    {
        "category": "employment",
        "title": "Kerala IT@School Youth Employment Programme",
        "description": "Youth unemployment skill gap industrial migration graduate unemployment IT skills",
        "solution": "IT skills certification embedded in ITI curriculum. Government-guaranteed PSU internship 6 months. Startup incubators in every district HQ with ₹10 lakh seed fund.",
        "source_state": "Kerala",
        "year": 2022,
        "outcome": "1.4 lakh youth placed annually. 4,200 startups incubated in 5 years. Out-migration reduced 18%. ₹2,800 crore GDP contribution by trainees.",
    },
    {
        "category": "electricity",
        "title": "Gujarat Kisan Suryodaya 24x7 Agricultural Power",
        "description": "Power cuts agricultural electricity rural electrification load shedding farmers pump sets",
        "solution": "Dedicated 3-phase agricultural feeder completely separated from domestic supply. 10,000 MW solar via village cooperatives. Smart meters with remote load management.",
        "source_state": "Gujarat",
        "year": 2020,
        "outcome": "10,000 villages get 24x7 agricultural power. Farmers earn ₹6,000/year from solar sales. AT&C losses: 33% to 12%.",
    },
    {
        "category": "governance",
        "title": "Telangana Online Building Permit Transparency",
        "description": "Building permits land records corruption bureaucratic delays citizen services online governance",
        "solution": "Fully online permit with AI-assisted approval routing. Real-time tracking via SMS and app. 30-day guaranteed approval or auto-grant provision.",
        "source_state": "Telangana",
        "year": 2021,
        "outcome": "Permit time: 90 to 21 days. Bribery complaints down 72%. 1.2 lakh permits processed online in FY2022-23.",
    },
    {
        "category": "migration",
        "title": "Uttar Pradesh ODOP One District One Product",
        "description": "Rural urban migration artisan unemployment traditional industry cottage industry revival employment",
        "solution": "Each district's signature product gets ₹25 crore ODOP fund, market linkage, GI tag, and export promotion. Cluster development with common facility centers.",
        "source_state": "Uttar Pradesh",
        "year": 2018,
        "outcome": "1.25 crore artisans employed. ₹85,000 crore exports. Products sold in 40 countries. Migration reversed in 12 districts.",
    },
    {
        "category": "nutrition",
        "title": "Odisha MAMATA Maternity Benefit Scheme",
        "description": "Malnutrition maternal health anemia child mortality infant health pregnant women nutrition",
        "solution": "₹5,000 cash transfer in two installments to all pregnant and lactating women. Conditional on institutional delivery and immunization. Door-step Aadhaar-linked payment.",
        "source_state": "Odisha",
        "year": 2019,
        "outcome": "Institutional delivery rose from 76% to 96%. Maternal anemia reduced by 34%. Underweight infants at birth down 28%.",
    },
    {
        "category": "urban",
        "title": "Pune Smart City ITMS Traffic Management",
        "description": "Urban traffic congestion city management smart city infrastructure road congestion Hyderabad",
        "solution": "AI-based Integrated Traffic Management System with 1,200 smart signals. Adaptive signal timing based on real-time vehicle density. Centralized incident management centre.",
        "source_state": "Maharashtra",
        "year": 2022,
        "outcome": "Average commute time reduced 22%. Accident rate down 31%. Emergency vehicle clearance time: 18 min to 6 min.",
    },
]


class DBService:
    """PostgreSQL + pgvector service for governance knowledge retrieval and caching."""

    def __init__(self):
        self._conn: Optional[psycopg2.extensions.connection] = None
        self._available = False
        try:
            self._init_db()
            self._available = True
            log.info("[DB] Database service initialized successfully")
        except Exception as exc:
            log.error("[DB] Failed to initialize — running without vector DB: %s", exc)

    # ── Connection ────────────────────────────────────────────────────────────

    def _get_conn(self) -> psycopg2.extensions.connection:
        try:
            if self._conn is None or self._conn.closed:
                self._conn = psycopg2.connect(DB_URL, connect_timeout=10)
            return self._conn
        except Exception as exc:
            self._conn = None
            raise exc

    # ── Schema Initialization ─────────────────────────────────────────────────

    def _init_db(self):
        conn = self._get_conn()
        with conn.cursor() as cur:
            # Enable pgvector extension
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")

            # Governance knowledge base with vector embeddings
            cur.execute("""
                CREATE TABLE IF NOT EXISTS governance_kb (
                    id           SERIAL PRIMARY KEY,
                    category     TEXT    NOT NULL,
                    title        TEXT    NOT NULL,
                    description  TEXT    NOT NULL,
                    solution     TEXT    NOT NULL,
                    source_state TEXT,
                    year         INTEGER,
                    outcome      TEXT,
                    embedding    vector(384),
                    created_at   TIMESTAMP DEFAULT NOW()
                );
            """)

            # HNSW index for fast approximate nearest-neighbor search
            cur.execute("""
                CREATE INDEX IF NOT EXISTS governance_kb_hnsw_idx
                ON governance_kb USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64);
            """)

            # Response cache with TTL
            cur.execute("""
                CREATE TABLE IF NOT EXISTS response_cache (
                    id            SERIAL PRIMARY KEY,
                    cache_key     TEXT UNIQUE NOT NULL,
                    context_type  TEXT,
                    lang          TEXT DEFAULT 'te',
                    response_json TEXT NOT NULL,
                    hits          INTEGER DEFAULT 0,
                    created_at    TIMESTAMP DEFAULT NOW(),
                    expires_at    TIMESTAMP NOT NULL
                );
            """)

            # District analytics time-series
            cur.execute("""
                CREATE TABLE IF NOT EXISTS district_analytics (
                    id              SERIAL PRIMARY KEY,
                    district_name   TEXT    NOT NULL,
                    sentiment_score INTEGER,
                    mood            TEXT,
                    key_issues      TEXT[],
                    recorded_at     TIMESTAMP DEFAULT NOW()
                );
            """)

        conn.commit()
        log.info("[DB] Schema ready")
        self._seed_kb()

    # ── Knowledge Base Seeding ────────────────────────────────────────────────

    def _seed_kb(self):
        conn = self._get_conn()
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM governance_kb;")
            count = cur.fetchone()[0]

        if count >= len(_KB_SEED):
            log.info("[DB] Knowledge base already has %d records — skipping seed", count)
            return

        log.info("[DB] Seeding knowledge base with %d governance case studies …", len(_KB_SEED))
        with conn.cursor() as cur:
            for item in _KB_SEED:
                search_text = f"{item['title']} {item['description']} {item['category']}"
                emb = self._embed(search_text)
                emb_sql = f"[{','.join(str(round(v, 6)) for v in emb)}]" if emb else None
                cur.execute(
                    """
                    INSERT INTO governance_kb
                        (category, title, description, solution, source_state, year, outcome, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING;
                    """,
                    (
                        item["category"], item["title"], item["description"],
                        item["solution"], item["source_state"], item["year"],
                        item["outcome"], emb_sql,
                    ),
                )
        conn.commit()
        log.info("[DB] Knowledge base seeded successfully")

    # ── Embedding Generation ──────────────────────────────────────────────────

    @staticmethod
    def _embed(text: str) -> Optional[List[float]]:
        """Generate a 384-dim embedding vector for the given text."""
        if not VECTOR_SEARCH or _encoder is None:
            return None
        try:
            vec = _encoder.encode(text, normalize_embeddings=True)
            return vec.tolist()
        except Exception as exc:
            log.error("[DB] Embedding error: %s", exc)
            return None

    # ── Semantic Search ───────────────────────────────────────────────────────

    def search_relevant_cases(
        self,
        query: str,
        category: str = None,
        top_k: int = 3,
    ) -> List[Dict]:
        """
        Return top-k relevant governance cases from the knowledge base.
        Uses vector cosine similarity when embeddings are available,
        otherwise falls back to PostgreSQL full-text search.
        """
        if not self._available:
            return []
        try:
            conn = self._get_conn()
            emb = self._embed(query)

            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                if emb:
                    vec_sql = f"[{','.join(str(round(v, 6)) for v in emb)}]"
                    if category:
                        cur.execute(
                            """
                            SELECT title, source_state, year, solution, outcome, category
                            FROM governance_kb
                            WHERE category = %s AND embedding IS NOT NULL
                            ORDER BY embedding <=> %s::vector
                            LIMIT %s;
                            """,
                            (category, vec_sql, top_k),
                        )
                    else:
                        cur.execute(
                            """
                            SELECT title, source_state, year, solution, outcome, category
                            FROM governance_kb
                            WHERE embedding IS NOT NULL
                            ORDER BY embedding <=> %s::vector
                            LIMIT %s;
                            """,
                            (vec_sql, top_k),
                        )
                else:
                    # Text-search fallback
                    if category:
                        cur.execute(
                            """
                            SELECT title, source_state, year, solution, outcome, category
                            FROM governance_kb
                            WHERE category = %s
                            ORDER BY year DESC
                            LIMIT %s;
                            """,
                            (category, top_k),
                        )
                    else:
                        cur.execute(
                            """
                            SELECT title, source_state, year, solution, outcome, category
                            FROM governance_kb
                            ORDER BY year DESC
                            LIMIT %s;
                            """,
                            (top_k,),
                        )

                return [dict(r) for r in cur.fetchall()]

        except Exception as exc:
            log.error("[DB] search_relevant_cases error: %s", exc)
            return []

    # ── Response Cache ────────────────────────────────────────────────────────

    def get_cached(self, key: str) -> Optional[Any]:
        """Retrieve a cached AI response if not expired. Returns parsed JSON."""
        if not self._available:
            return None
        try:
            conn = self._get_conn()
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT response_json FROM response_cache WHERE cache_key=%s AND expires_at>NOW();",
                    (key,),
                )
                row = cur.fetchone()
            if row:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE response_cache SET hits=hits+1 WHERE cache_key=%s;",
                        (key,),
                    )
                conn.commit()
                return json.loads(row["response_json"])
            return None
        except Exception as exc:
            log.error("[DB] get_cached error: %s", exc)
            return None

    def set_cached(
        self,
        key: str,
        data: Any,
        context_type: str = "",
        lang: str = "te",
        ttl_hours: int = 6,
    ):
        """Cache any JSON-serializable data with an expiry time."""
        if not self._available:
            return
        try:
            conn = self._get_conn()
            expires = datetime.utcnow() + timedelta(hours=ttl_hours)
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO response_cache
                        (cache_key, context_type, lang, response_json, expires_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (cache_key) DO UPDATE
                        SET response_json = EXCLUDED.response_json,
                            expires_at    = EXCLUDED.expires_at,
                            created_at    = NOW();
                    """,
                    (key, context_type, lang, json.dumps(data, ensure_ascii=False), expires),
                )
            conn.commit()
        except Exception as exc:
            log.error("[DB] set_cached error: %s", exc)
            if self._conn:
                self._conn.rollback()

    # ── District Analytics ────────────────────────────────────────────────────

    def store_district_snapshot(
        self,
        district: str,
        score: int,
        mood: str,
        issues: List[str],
    ):
        """Persist a district sentiment snapshot for historical trending."""
        if not self._available:
            return
        try:
            conn = self._get_conn()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO district_analytics
                        (district_name, sentiment_score, mood, key_issues)
                    VALUES (%s, %s, %s, %s);
                    """,
                    (district, score, mood, issues),
                )
            conn.commit()
        except Exception as exc:
            log.error("[DB] store_district_snapshot error: %s", exc)
            if self._conn:
                self._conn.rollback()

    def get_district_trend(
        self,
        district: str,
        days: int = 30,
    ) -> List[Dict]:
        """Return historical sentiment data for a district over the last N days."""
        if not self._available:
            return []
        try:
            conn = self._get_conn()
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT sentiment_score, mood, key_issues, recorded_at
                    FROM district_analytics
                    WHERE district_name = %s
                      AND recorded_at > NOW() - (%s * INTERVAL '1 day')
                    ORDER BY recorded_at DESC;
                    """,
                    (district, days),
                )
                return [dict(r) for r in cur.fetchall()]
        except Exception as exc:
            log.error("[DB] get_district_trend error: %s", exc)
            return []

    # ── Cleanup ───────────────────────────────────────────────────────────────

    def close(self):
        if self._conn and not self._conn.closed:
            self._conn.close()
            log.info("[DB] Connection closed")
