FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements-rag.txt requirements.txt ./
# Build deps for wheels (e.g., PyStemmer) on slim base
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential gcc g++ make python3-dev \
    && pip install --no-cache-dir -r requirements-rag.txt \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir rich \
    && apt-get purge -y --auto-remove build-essential gcc g++ make \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /root/.cache/pip

COPY . .

EXPOSE 8012

CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "8012"]
