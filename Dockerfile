# ─────────────────────────────────────────────────────────────────────────────
# Telangana AI Governance Dashboard — Docker Image
# For EasyPanel deployment (or any Docker host)
#
# Build:  docker build -t telangana-gov .
# Run:    docker run -e GROQ_API_KEY=your_key -p 5000:5000 telangana-gov
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim

# Install system dependencies needed by gTTS / requests
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend first (for layer caching — only rebuilt when requirements change)
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy rest of the source
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Expose the Flask port (EasyPanel will auto-detect via the PORT env var)
EXPOSE 5000

# Use gunicorn for production; Flask dev server is single-threaded
# Workers: 1 so the scheduler runs in exactly one process
CMD ["gunicorn", \
     "--bind", "0.0.0.0:5000", \
     "--workers", "1", \
     "--threads", "4", \
     "--timeout", "120", \
     "--chdir", "/app/backend", \
     "app:app"]
