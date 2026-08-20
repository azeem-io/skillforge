FROM python:3.13-slim

WORKDIR /app

# Build context is the repo root so one compose file builds every service.

RUN adduser --disabled-password --gecos "" --uid 10001 app

COPY python-analyzer/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY python-analyzer/analyzer/ ./analyzer/
COPY python-analyzer/main.py .

USER app
EXPOSE 8085

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8085/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8085"]
