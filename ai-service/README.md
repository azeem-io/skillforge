# ai-service

Generation, retrieval and the Career Planning Agent.

## The three AI requirements, and where each lives

| Requirement | Where |
|---|---|
| Generative AI | `/chat` and `/expand` — DeepSeek via the OpenAI-compatible SDK |
| RAG | `service/retrieval.py` — the knowledge base is embedded and searched before any answer |
| Agentic AI | `service/agent.py` — four tools performing real actions |

## Endpoints

`GET /health` · `POST /search` · `POST /chat` · `POST /agent` · `POST /expand`

`/search` returns retrieval results with no generation, which makes it easy to
show what RAG actually retrieved.

## The agent's tools

| Tool | Action |
|---|---|
| `analyze_student_skills` | POSTs the student's graph to python-analyzer `/analyze` |
| `generate_skill_gap` | POSTs to python-analyzer `/gaps`, weighted and ranked |
| `create_roadmap` | POSTs to python-analyzer `/roadmap` |
| `search_learning_resources` | Cosine search over the embedded knowledge base |

Three call a real service; one searches a real corpus. None return canned text.

## Embeddings

DeepSeek exposes no embeddings endpoint, so retrieval embeds locally with
`fastembed` (ONNX, ~50MB, no PyTorch). The index is in memory — the corpus is a
few dozen chunks, so a linear scan beats a round trip to a vector database.
pgvector is the move if the corpus outgrows memory.

The model downloads on first embed, which is why the container healthcheck has a
40s start period.

## Local

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/pytest                      # 30 tests, no key or network needed
KNOWLEDGE_BASE_PATH=../rag/knowledge-base \
  .venv/bin/uvicorn main:app --reload --port 8084
```

Set `DEEPSEEK_API_KEY` for anything that generates. `/search` and `/health` work
without it.
