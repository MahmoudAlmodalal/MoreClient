"""Split extracted text into ~800-char chunks with 120-char overlap."""

from langchain_text_splitters import RecursiveCharacterTextSplitter

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=120,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def chunk_text(text: str) -> list[str]:
    text = (text or "").strip()
    if not text:
        return []
    return [c for c in _splitter.split_text(text) if c.strip()]
