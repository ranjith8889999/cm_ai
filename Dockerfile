# ─────────────────────────────────────────────────────────────────────────────
# Telangana AI Governance Dashboard — Docker Image
# For EasyPanel deployment (or any Docker host)
#
# Build:  docker build -t telangana-gov .
# Run:    docker run -e GROQ_API_KEY=your_key -p 8080:80 telangana-gov
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

# Expose the HTTP port EasyPanel routes to by default.
# Set PORT to override this in local Docker Compose or another platform.
ENV PORT=80
EXPOSE 80

# Use gunicorn for production; Flask dev server is single-threaded
# Workers: 1 so the scheduler runs in exactly one process
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT:-80} --workers 1 --threads 4 --timeout 120 --chdir /app/backend app:app"]
