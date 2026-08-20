from __future__ import annotations

import math
from typing import Protocol, Sequence

from .knowledge import Chunk


class Embedder(Protocol):
    def embed(self, texts: Sequence[str]) -> list[list[float]]: ...


class FastEmbedder:
    """
    fastembed is ONNX-based — no PyTorch, ~50MB. DeepSeek exposes no embeddings
    endpoint, so retrieval embeds locally. The model downloads on first use, so
    construction is deferred until something actually embeds.
    """

    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5") -> None:
        self._model_name = model_name
        self._model = None

    def _load(self):
        if self._model is None:
            from fastembed import TextEmbedding

            self._model = TextEmbedding(model_name=self._model_name)
        return self._model

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        return [list(map(float, v)) for v in self._load().embed(list(texts))]


def cosine(a: Sequence[float], b: Sequence[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


class Retriever:
    """
    In-memory vector index over the knowledge base.

    The corpus is a few dozen chunks, so a linear scan is faster than a round
    trip to a vector database and has no infrastructure to keep alive. pgvector
    is the move if the corpus ever outgrows memory.
    """

    def __init__(self, chunks: list[Chunk], embedder: Embedder) -> None:
        self._chunks = chunks
        self._embedder = embedder
        self._vectors: list[list[float]] | None = None

    def index(self) -> None:
        if self._vectors is None and self._chunks:
            texts = [f"{c.title}. {c.heading}. {c.text}" for c in self._chunks]
            self._vectors = self._embedder.embed(texts)

    def search(self, query: str, k: int = 4) -> list[tuple[Chunk, float]]:
        self.index()
        if not self._vectors:
            return []

        q = self._embedder.embed([query])[0]
        scored = [
            (chunk, cosine(q, vec))
            for chunk, vec in zip(self._chunks, self._vectors)
        ]
        scored.sort(key=lambda pair: pair[1], reverse=True)
        return scored[:k]

    @property
    def size(self) -> int:
        return len(self._chunks)

    @property
    def indexed(self) -> bool:
        return self._vectors is not None


def build_context(results: list[tuple[Chunk, float]]) -> str:
    """Retrieved chunks formatted for the prompt, each labelled for citation."""
    blocks = []
    for i, (chunk, score) in enumerate(results, start=1):
        blocks.append(f"[{i}] {chunk.citation} (relevance {score:.2f})\n{chunk.text}")
    return "\n\n".join(blocks)
