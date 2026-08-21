# ai-service

Generation, retrieval and the Career Planning Agent.

## The three AI requirements, and where each lives

| Requirement | Where |
|---|---|
| Generative AI | `/chat`, `/expand` and `/narrate` — DeepSeek via the OpenAI-compatible SDK |
| RAG | `service/retrieval.py` — the knowledge base is embedded and searched before any answer |
| Agentic AI | `service/agent.py` — six tools performing real actions |

## Endpoints

`GET /health` · `POST /search` · `POST /chat` · `POST /agent` · `POST /expand`
· `POST /narrate`

`/search` returns retrieval results with no generation, which makes it easy to
show what RAG actually retrieved.

`/narrate` is the one endpoint whose output is written to the database, and the
only caller is skill-service. It receives a roadmap that has already been
computed — phases, order, titles, week estimates — and returns prose about it:
`roadmaps.narration` and one `roadmap_phases.rationale` per phase. A rationale
for a phase number it was not sent is dropped rather than stored, because
writing it is the one way a model could reshape a plan it was only asked to
describe.

## The agent's tools

| Tool | Action |
|---|---|
| `analyze_student_skills` | POSTs the student's graph to python-analyzer `/analyze` |
| `generate_skill_gap` | POSTs to python-analyzer `/gaps`, weighted and ranked |
| `create_roadmap` | POSTs to python-analyzer `/roadmap` |
| `compare_target_roles` | POSTs to python-analyzer `/compare` — scores every role at once, best fit first |
| `search_learning_resources` | Cosine search over the embedded knowledge base |
| `get_assessment_history` | Reads the graded attempts the caller supplied in `context` |

Four call a real service, one searches a real corpus, one reads the student's
own results. None return canned text.

The PDF names four tools. `compare_target_roles` is one extra — it answers "is
this the right goal for me?", the question a student asks before any of the
other four are worth running. `get_assessment_history` is the other: a
demonstrated level cannot say whether it came from a test or from a form, and
"how did I do?" is the first thing anyone asks after finishing a quiz. It is a
tool rather than prompt context so the attempts only cost tokens when they are
actually asked for.

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
.venv/bin/pytest                      # 57 tests, no key or network needed
KNOWLEDGE_BASE_PATH=../rag/knowledge-base \
  .venv/bin/uvicorn main:app --reload --port 8084
```

Set `DEEPSEEK_API_KEY` for anything that generates. `/search` and `/health` work
without it.
