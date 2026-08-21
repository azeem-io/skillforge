# ai-service

Generation, retrieval and the Career Planning Agent.

## The three AI requirements, and where each lives

| Requirement | Where |
|---|---|
| Generative AI | `/chat` and `/expand` — DeepSeek via the OpenAI-compatible SDK |
| RAG | `service/retrieval.py` — the knowledge base is embedded and searched before any answer |
| Agentic AI | `service/agent.py` — five tools performing real actions |

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
| `compare_target_roles` | POSTs to python-analyzer `/compare` — scores every role at once, best fit first |
| `search_learning_resources` | Cosine search over the embedded knowledge base |

Four call a real service; one searches a real corpus. None return canned text.

The PDF names four tools. `compare_target_roles` is the extra one — it answers
"is this the right goal for me?", which is the question a student asks before
any of the other four are worth running.

## Embeddings

DeepSeek exposes no embeddings endpoint, so retrieval embeds locally with
`fastembed` (ONNX, ~50MB, no PyTorch). The index is in memory — the corpus is a
few dozen chunks, so a linear scan beats a round trip to a vector database.
pgvector is the move if the corpus outgrows memory.

The image pulls the model at build time into `/opt/fastembed`, so a container
never waits on HuggingFace and works with no outbound access to anything but
DeepSeek. The healthcheck's 40s start period covers embedding the corpus, not a
download.

Running from a local venv instead, the download does happen once —
`scripts/setup.sh --local` pulls it before starting the service and pins
`FASTEMBED_CACHE_PATH` outside `/tmp` so it survives a reboot.

## Local

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/pytest                      # 33 tests, no key or network needed
KNOWLEDGE_BASE_PATH=../rag/knowledge-base \
  .venv/bin/uvicorn main:app --reload --port 8084
```

Set `DEEPSEEK_API_KEY` for anything that generates. `/search` and `/health` work
without it.
