from groq import Groq
import json
import os

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
