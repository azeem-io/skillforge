from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

# Chunks are split on markdown headings rather than a fixed character count, so
# a retrieved chunk is always a complete thought with its heading attached.
# Fixed-size windows cut mid-sentence and retrieve worse on a corpus this small.
MAX_CHARS = 1400


@dataclass(frozen=True)
class Chunk:
    doc_id: str
    title: str
    heading: str
    text: str
    doc_type: str

    @property
    def citation(self) -> str:
        return f"{self.title} — {self.heading}" if self.heading else self.title


def _parse_front_matter(raw: str) -> tuple[dict[str, str], str]:
    if not raw.startswith("---"):
        return {}, raw
    end = raw.find("\n---", 3)
    if end == -1:
        return {}, raw

    meta: dict[str, str] = {}
    for line in raw[3:end].strip().splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip()
    return meta, raw[end + 4 :]


def _split_sections(body: str) -> list[tuple[str, str]]:
    """(heading, text) pairs, splitting on ## headings."""
    parts = re.split(r"^##\s+(.+)$", body, flags=re.MULTILINE)
    sections: list[tuple[str, str]] = []

    preamble = parts[0].strip()
    preamble = re.sub(r"^#\s+.+$", "", preamble, count=1, flags=re.MULTILINE).strip()
    if preamble:
        sections.append(("", preamble))

    for i in range(1, len(parts), 2):
        heading = parts[i].strip()
        text = parts[i + 1].strip() if i + 1 < len(parts) else ""
        if text:
            sections.append((heading, text))

    return sections


def _split_long(heading: str, text: str) -> list[str]:
    if len(text) <= MAX_CHARS:
        return [text]

    out: list[str] = []
    current = ""
    for para in text.split("\n\n"):
        if current and len(current) + len(para) + 2 > MAX_CHARS:
            out.append(current.strip())
            current = para
        else:
            current = f"{current}\n\n{para}" if current else para
    if current.strip():
        out.append(current.strip())
    return out


def load_chunks(root: Path) -> list[Chunk]:
    """Every markdown file under `root`, split into retrievable chunks."""
    chunks: list[Chunk] = []

    for path in sorted(root.rglob("*.md")):
        raw = path.read_text(encoding="utf-8")
        meta, body = _parse_front_matter(raw)
        doc_id = str(path.relative_to(root))
        title = meta.get("title") or path.stem.replace("-", " ").title()
        doc_type = meta.get("type", "reference")

        for heading, text in _split_sections(body):
            for piece in _split_long(heading, text):
                chunks.append(
                    Chunk(
                        doc_id=doc_id,
                        title=title,
                        heading=heading,
                        text=piece,
                        doc_type=doc_type,
                    )
                )

    return chunks
