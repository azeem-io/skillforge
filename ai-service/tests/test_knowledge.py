from pathlib import Path

import pytest

from service.knowledge import load_chunks
from service.retrieval import Retriever, build_context, cosine

KB = Path(__file__).resolve().parents[2] / "rag" / "knowledge-base"


class StubEmbedder:
    """Bag-of-words vectors over a fixed vocabulary. Deterministic, no download."""

    def __init__(self, vocab: list[str]) -> None:
        self._vocab = vocab

    def embed(self, texts):
        out = []
        for t in texts:
            low = t.lower()
            out.append([float(low.count(w)) for w in self._vocab])
        return out


class TestLoadChunks:
    def test_reads_the_real_knowledge_base(self):
        assert len(load_chunks(KB)) > 20

    def test_every_chunk_has_text_and_a_title(self):
        for c in load_chunks(KB):
            assert c.text.strip()
            assert c.title.strip()

    def test_front_matter_is_stripped_from_text(self):
        for c in load_chunks(KB):
            assert "---" not in c.text.split("\n")[0]
            assert not c.text.startswith("title:")

    def test_titles_come_from_front_matter(self):
        titles = {c.title for c in load_chunks(KB)}
        assert "AI Engineer" in titles
        assert "How to sequence learning" in titles

    def test_doc_type_is_captured(self):
        types = {c.doc_type for c in load_chunks(KB)}
        assert {"career", "roadmap", "project", "skill"} <= types

    def test_chunks_respect_the_size_ceiling(self):
        from service.knowledge import MAX_CHARS

        assert all(len(c.text) <= MAX_CHARS for c in load_chunks(KB))

    def test_citation_includes_heading_when_present(self):
        with_heading = [c for c in load_chunks(KB) if c.heading]
        assert with_heading
        assert " — " in with_heading[0].citation


class TestCosine:
    def test_identical_vectors_score_one(self):
        assert cosine([1.0, 2.0], [1.0, 2.0]) == pytest.approx(1.0)

    def test_orthogonal_vectors_score_zero(self):
        assert cosine([1.0, 0.0], [0.0, 1.0]) == 0.0

    def test_zero_vector_does_not_divide_by_zero(self):
        assert cosine([0.0, 0.0], [1.0, 1.0]) == 0.0


class TestRetriever:
    def _retriever(self, vocab):
        return Retriever(load_chunks(KB), StubEmbedder(vocab))

    def test_returns_k_results(self):
        assert len(self._retriever(["python", "docker"]).search("python", k=3)) == 3

    def test_ranks_the_matching_chunk_first(self):
        r = self._retriever(["kubernetes", "pandas"])
        top, _ = r.search("kubernetes kubernetes kubernetes", k=1)[0]
        assert "kubernetes" in top.text.lower()

    def test_empty_corpus_returns_nothing(self):
        assert Retriever([], StubEmbedder(["x"])).search("anything") == []

    def test_index_is_built_once(self):
        class Counting(StubEmbedder):
            calls = 0

            def embed(self, texts):
                Counting.calls += 1
                return super().embed(texts)

        r = Retriever(load_chunks(KB), Counting(["python"]))
        r.search("a")
        r.search("b")
        # one index build, plus one embed per query
        assert Counting.calls == 3

    def test_build_context_labels_each_chunk(self):
        results = self._retriever(["python"]).search("python", k=2)
        ctx = build_context(results)
        assert "[1]" in ctx and "[2]" in ctx
        assert "relevance" in ctx
