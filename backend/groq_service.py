from groq import Groq
import json
import os
from dotenv import load_dotenv

# Load .env file for local development (ignored in production where env vars are set directly)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Read from environment variable.
# Set GROQ_API_KEY in your .env file or EasyPanel environment variables.
# Get your key at https://console.groq.com/keys
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
if not GROQ_API_KEY:
    import warnings
    warnings.warn("GROQ_API_KEY is not set. AI features will not work. Set it in .env or environment variables.")


class GroqService:
    def __init__(self):
        self.client = Groq(api_key=GROQ_API_KEY)
        self.model = "llama-3.1-8b-instant"

    def _chat(self, messages, temperature=0.7, max_tokens=1024):
        try:
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=1,
                stop=None,
            )
            return completion.choices[0].message.content
        except Exception as e:
            return f"Error: {str(e)}"

    def summarize_news(self, news_text):
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a Telugu news summarizer for Telangana state. "
                    "Summarize the news in Telugu in 2-3 simple sentences. "
                    "Use easy words, no heavy jargon."
                ),
            },
            {
                "role": "user",
                "content": f"Summarize this news in Telugu: {news_text}",
            },
        ]
        return self._chat(messages)

    def get_governance_suggestions(self, district=""):
        context = f"in {district} district of Telangana" if district else "in Telangana state"
        messages = [
            {
                "role": "system",
                "content": (
                    "You are an AI governance advisor for Telangana. "
                    "Provide 3 practical, actionable suggestions in JSON array format. "
                    "Each item must have: problem_telugu, impact_telugu, suggestion_telugu, priority (high/medium/low), action_steps (array of 2 short Telugu strings)."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Generate 3 governance suggestions {context}. "
                    "Focus on water, roads, healthcare, education, or agriculture. "
                    "Return valid JSON array only."
                ),
            },
        ]
        raw = self._chat(messages, temperature=0.6)
        # Try to extract JSON from response
        try:
            start = raw.find("[")
            end = raw.rfind("]") + 1
            if start != -1 and end > start:
                return json.loads(raw[start:end])
        except Exception:
            pass
        return []

    def answer_query(self, query):
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a Telugu-speaking AI assistant for Telangana governance. "
                    "Answer questions about Telangana districts, issues, and governance in Telugu. "
                    "Keep answers brief, helpful, and in simple Telugu."
                ),
            },
            {"role": "user", "content": f"Answer in Telugu: {query}"},
        ]
        return self._chat(messages, temperature=0.8)

    def generate_daily_brief(self):
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a Telugu morning briefing assistant for Telangana governance. "
                    "Generate a 60-second verbal brief in Telugu. "
                    "Include: top news, public mood, key alerts, and one AI suggestion."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Generate today's morning briefing in Telugu for the Chief Minister. "
                    "Make it 100-150 words, natural sounding, and easy to read aloud."
                ),
            },
        ]
        return self._chat(messages, max_tokens=512)

    def district_summary(self, district_name, issues):
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a district briefing AI for Telangana. "
                    "Give a 2-sentence summary of the situation in a district, in Telugu."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Briefly summarize the situation in {district_name} district of Telangana. "
                    f"Current issues: {', '.join(issues)}. Answer in Telugu only."
                ),
            },
        ]
        return self._chat(messages, max_tokens=200)

    def sentiment_insight(self, district, sentiment, score):
        messages = [
            {
                "role": "system",
                "content": "You are a sentiment analysis reporter for Telangana in Telugu.",
            },
            {
                "role": "user",
                "content": (
                    f"{district} district sentiment is {sentiment} with score {score}/100. "
                    "Write one insightful Telugu sentence about what this means for governance."
                ),
            },
        ]
        return self._chat(messages, max_tokens=150)

    def analyze_and_resolve(self, context_type: str, summary: str, lang: str = "te") -> dict:
        """
        Analyze historical data for a given context (alerts/districts/news/governance)
        and return an analysis + actionable resolution steps as JSON.
        lang: "te" = Telugu (default), "en" = English
        """
        is_en = lang == "en"
        lang_instruction = "English" if is_en else "Telugu"
        context_descriptions = {
            "alerts": (
                "You are a senior governance analyst for Telangana Chief Minister's Office. "
                "Analyze the provided active alerts across districts. Identify patterns, "
                f"root causes, and the most critical issues. Respond ONLY with valid JSON in {lang_instruction}."
            ),
            "districts": (
                "You are a district performance analyst for Telangana Chief Minister's Office. "
                "Analyze district sentiment scores, trends, and issues. Identify which districts "
                f"need priority intervention. Respond ONLY with valid JSON in {lang_instruction}."
            ),
            "news": (
                "You are a media intelligence analyst for Telangana Chief Minister's Office. "
                "Analyze news sentiment patterns across districts. Identify root causes of "
                f"negative news and suggest how to improve public perception. Respond ONLY with valid JSON in {lang_instruction}."
            ),
            "governance": (
                "You are a policy strategy advisor for Telangana Chief Minister's Office. "
                "Analyze pending governance issues and AI suggestions. Identify systemic gaps "
                f"and provide a policy roadmap. Respond ONLY with valid JSON in {lang_instruction}."
            ),
        }
        system_prompt = context_descriptions.get(
            context_type,
            f"You are a governance analyst for Telangana. Respond ONLY with valid JSON in {lang_instruction}.",
        )
        if is_en:
            analysis_key_desc = '"analysis_text": a 2-3 sentence English paragraph analyzing the current situation, patterns, and urgency level.'
            steps_desc = (
                "   - Be in English\n"
                "   - Name the responsible department (e.g., Jal Jeevan Mission, Agriculture Dept, NDRF, NHM)\n"
                "   - Include a specific timeline (e.g., within 24 hours, within 7 days, within 30 days)\n"
                "   - State a concrete measurable action\n"
                '   Example format: "Jal Jeevan Mission: Deploy 20 water tankers to Nizamabad within 48 hours"'
            )
            fallback_analysis = "Multiple critical governance issues require immediate attention across Telangana districts. Historical patterns indicate recurring problems in water, agriculture, and healthcare sectors."
            fallback_steps = [
                "Hold emergency meeting with concerned departments within 24 hours",
                "District Collectors: Set clear targets and deadlines within 48 hours",
                "CMO: Prepare Action Plan within 7 days",
                "Review progress weekly and escalate blockers",
                "Submit complete status report within 30 days",
            ]
        else:
            analysis_key_desc = '"analysis_telugu": a 2-3 sentence Telugu paragraph analyzing the current situation, patterns, and urgency level.'
            steps_desc = (
                "   - Be in Telugu\n"
                "   - Name the responsible department (e.g., జల్ జీవన్ మిషన్, వ్యవసాయ శాఖ, NDRF, NHM)\n"
                "   - Include a specific timeline (e.g., 24 గంటల్లో, 7 రోజుల్లో, 30 రోజుల్లో)\n"
                "   - State a concrete measurable action\n"
                "   Example format: 'జల్ జీవన్ మిషన్: 48 గంటల్లో 20 వాటర్ ట్యాంకర్లు నిజామాబాద్ పంపాలి'"
            )
            fallback_analysis = "విశ్లేషణ అందుబాటులో లేదు. తర్వాత మళ్ళీ ప్రయత్నించండి."
            fallback_steps = [
                "సంబంధిత శాఖలతో అత్యవసర సమావేశం 24 గంటల్లో నిర్వహించాలి",
                "జిల్లా కలెక్టర్లకు 48 గంటల్లో స్పష్టమైన లక్ష్యాలు నిర్ణయించాలి",
                "CMO: 7 రోజుల్లో యాక్షన్ ప్లాన్ రూపొందించాలి",
                "పురోగతిని వారానికొకసారి సమీక్షించాలి",
                "30 రోజుల్లో పూర్తి నివేదిక సమర్పించాలి",
            ]

        # Use "analysis_text" for English, "analysis_telugu" for Telugu (backward compat)
        analysis_field = "analysis_text" if is_en else "analysis_telugu"
        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    f"Current data:\n{summary}\n\n"
                    f"Return a JSON object with EXACTLY these two keys:\n"
                    f'1. "{analysis_field}": {analysis_key_desc}\n'
                    '2. "resolution_steps": a JSON array of exactly 5 strings. Each string must:\n'
                    f"{steps_desc}\n"
                    "Return ONLY valid JSON, no extra text or markdown."
                ),
            },
        ]
        raw = self._chat(messages, temperature=0.4, max_tokens=1000)
        try:
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start != -1 and end > start:
                parsed = json.loads(raw[start:end])
                if "resolution_steps" in parsed:
                    # Normalize: always expose both keys for frontend
                    if "analysis_text" in parsed and "analysis_telugu" not in parsed:
                        parsed["analysis_telugu"] = parsed["analysis_text"]
                    elif "analysis_telugu" not in parsed and "analysis_text" not in parsed:
                        parsed["analysis_telugu"] = fallback_analysis
                    return parsed
        except Exception:
            pass
        return {
            "analysis_telugu": fallback_analysis,
            "resolution_steps": fallback_steps,
        }
