"""DOCX text extraction via python-docx."""

import io

from docx import Document as DocxDocument


def extract_docx(data: bytes) -> str:
    doc = DocxDocument(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip()).strip()
