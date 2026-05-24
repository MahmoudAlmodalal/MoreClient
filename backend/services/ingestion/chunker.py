"""Split extracted text into retrieval-friendly chunks.

For structured markdown (headings + ``**bold question**`` FAQ pairs — the shape
of the seeded NGO FAQ and most uploaded help docs) we chunk on semantic
boundaries: each Q&A pair stays intact and is prefixed with its document title +
section heading, so the heading context is both embedded and shown to the LLM.
Small adjacent pairs under the same heading are packed together up to a budget.

Arbitrary/unstructured text falls back to the original character splitter
(~800 chars / 120 overlap), so non-FAQ uploads behave exactly as before.

``chunk_text(text) -> list[str]`` is the single public entry point and its
signature is unchanged.
"""

import re

from langchain_text_splitters import RecursiveCharacterTextSplitter

CHUNK_SIZE = 800
CHUNK_OVERLAP = 120
# Pack adjacent Q&A pairs under the same heading up to this many chars before
# starting a new chunk. Kept below CHUNK_SIZE so chunks stay focused (better
# retrieval precision) while tiny pairs don't each become their own chunk.
_PACK_BUDGET = 600

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=["\n\n", "\n", ". ", " ", ""],
)

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*\S)\s*$")
_BOLD_Q_RE = re.compile(r"^\*\*(.+?)\*\*\s*$")  # a full-line bold label/question


def chunk_text(text: str) -> list[str]:
    text = (text or "").strip()
    if not text:
        return []
    structured = _structured_chunks(text)
    if structured:
        return structured
    return [c for c in _splitter.split_text(text) if c.strip()]


def _context(title: str, section: str) -> str:
    return " — ".join(p for p in (title, section) if p)


def _structured_chunks(text: str) -> list[str] | None:
    """Chunk markdown FAQ/heading docs by semantic unit. None if not structured."""
    lines = text.split("\n")
    has_heading = any(_HEADING_RE.match(ln) for ln in lines)
    has_bold_q = any(_BOLD_Q_RE.match(ln.strip()) for ln in lines)
    if not (has_heading or has_bold_q):
        return None

    title = ""
    section = ""
    units: list[tuple[str, str]] = []  # (heading-context, block text)
    block: list[str] = []
    block_ctx = ""

    def flush() -> None:
        nonlocal block
        body = "\n".join(block).strip()
        block = []
        if body:
            units.append((block_ctx, body))

    for ln in lines:
        heading = _HEADING_RE.match(ln)
        if heading:
            flush()
            level, label = len(heading.group(1)), heading.group(2).strip()
            if level == 1:
                title, section = label, ""
            else:
                section = label
            block_ctx = _context(title, section)
            continue
        bold = _BOLD_Q_RE.match(ln.strip())
        if bold:
            flush()
            block_ctx = _context(title, section)
            block.append(bold.group(1).strip())  # question text, asterisks stripped
            continue
        block.append(ln)
    flush()

    if not units:
        return None
    return _pack(units)


def _pack(units: list[tuple[str, str]]) -> list[str]:
    """Merge adjacent same-context units up to the budget; re-prefix the heading."""
    chunks: list[str] = []
    buf_ctx: str | None = None
    buf: list[str] = []

    def emit() -> None:
        nonlocal buf
        if not buf:
            return
        body = "\n\n".join(buf).strip()
        prefix = f"{buf_ctx}\n\n" if buf_ctx else ""
        if len(prefix) + len(body) > CHUNK_SIZE * 1.5:
            for piece in _splitter.split_text(body):
                piece = piece.strip()
                if piece:
                    chunks.append((prefix + piece).strip())
        else:
            chunks.append((prefix + body).strip())
        buf = []

    for ctx, body in units:
        if buf_ctx is None:
            buf_ctx = ctx
        prospective = sum(len(b) for b in buf) + len(body)
        if ctx != buf_ctx or (buf and prospective > _PACK_BUDGET):
            emit()
            buf_ctx = ctx
        buf.append(body)
    emit()
    return [c for c in chunks if c.strip()]
