# Six Seven API — FastAPI on Python 3.12.
#
# Build context is the backend/ directory:
#   docker build -t sixseven-api backend/
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# psycopg2-binary ships wheels, so only curl (for the container healthcheck) is
# needed at runtime. Kept in one layer to keep the image small.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Requirements first so dependency layers cache across code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as a non-root user. The uploads volume is chowned so the app can write to it.
RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /data/uploads \
    && chown -R appuser:appuser /app /data
USER appuser

ENV PORT=8000 \
    UPLOADS_DIR=/data/uploads \
    ENVIRONMENT=production

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/api/health" || exit 1

# Schema is brought up to date before the API accepts traffic, so a deploy can
# never serve code that is ahead of the database. Shell form so the platform's
# $PORT is expanded.
CMD ["sh", "-c", "python scripts/bootstrap.py && exec uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers ${WEB_CONCURRENCY:-2} --proxy-headers --forwarded-allow-ips='*'"]
