FROM python:3.13-slim

WORKDIR /app

RUN adduser --disabled-password --gecos "" --uid 10002 app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY service/ ./service/
COPY main.py .
# The corpus ships in the image: it is a submission deliverable and small
# enough that a volume would only add a failure mode.
COPY rag/knowledge-base/ ./knowledge-base/

ENV KNOWLEDGE_BASE_PATH=/app/knowledge-base
# fastembed caches its ONNX model here; writable by the app user.
ENV FASTEMBED_CACHE_PATH=/tmp/fastembed

USER app
EXPOSE 8084

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8084/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8084"]
