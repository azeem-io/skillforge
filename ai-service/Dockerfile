FROM python:3.13-slim

WORKDIR /app

RUN adduser --disabled-password --gecos "" --uid 10002 app

# Build context is the repo root, not ai-service/: the knowledge base lives
# outside this directory. Build with -f ai-service/Dockerfile .
COPY ai-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ARG EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
ENV EMBEDDING_MODEL=${EMBEDDING_MODEL}
ENV FASTEMBED_CACHE_PATH=/opt/fastembed
# Pulled at build time so a demo never waits on a HuggingFace download, and so
# the container works with no outbound access to anything but DeepSeek.
RUN python -c "import os; from fastembed import TextEmbedding; TextEmbedding(model_name=os.environ['EMBEDDING_MODEL'])" \
  && chown -R app:app /opt/fastembed

COPY ai-service/service/ ./service/
COPY ai-service/main.py .
# The corpus ships in the image: it is a submission deliverable and small
# enough that a volume would only add a failure mode.
COPY rag/knowledge-base/ ./knowledge-base/

ENV KNOWLEDGE_BASE_PATH=/app/knowledge-base

USER app
EXPOSE 8084

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8084/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8084"]
