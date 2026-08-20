FROM python:3.13-slim

WORKDIR /app

RUN adduser --disabled-password --gecos "" --uid 10001 app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY analyzer/ ./analyzer/
COPY main.py .

USER app
EXPOSE 8085

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8085/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8085"]
