"""Load the bilingual NGO demo knowledge base into the running stack.

Reads the seed files in backend/seed/, runs them through the real ingestion
pipeline (ingest_document -> chunk -> embed -> Chroma + Document row), and
tunes the demo confidence threshold so off-topic questions escalate cleanly.

Idempotent: any prior demo document with the same title is deleted (SQL row +
Chroma chunks) before re-ingesting, so repeated runs don't pile up duplicates.

Run from the repo root:
    python -m backend.scripts.seed_demo
    python -m backend.scripts.seed_demo --threshold 0.6
"""

import argparse
from pathlib import Path

from backend.models.database import SessionLocal, init_db
from backend.models.tables import Document, get_or_create_settings
from backend.services.ai import vectorstore
from backend.services.ingestion.ingest import ingest_document

# Seed files live in backend/seed/ relative to the repo root.
SEED_DIR = Path(__file__).resolve().parents[1] / "seed"
SEED_FILES = ["ngo_faq_en.md", "ngo_faq_ar.md"]

# Default demo threshold = the product default 0.45.
#
# Why not higher: in KEYLESS mode (no OPENAI_API_KEY) confidence is LEXICAL, not
# semantic, so genuine in-KB questions can score ~0.55 while off-topic ones can
# score ~0.73 — the values interleave and don't separate cleanly. Raising the
# threshold therefore makes real questions wrongly escalate. Keep it low so all
# in-KB questions answer reliably, and demo escalation via the deterministic
# "talk to a human" keyword (handled in rag.resolve_strategy, bypasses
# confidence entirely). With a real OPENAI_API_KEY embeddings are semantic and
# confidence-based escalation on off-topic questions also works — raise to ~0.6 then.
DEFAULT_THRESHOLD = 0.45


def _purge_existing(db, title: str) -> None:
    """Drop any prior demo Document with this title plus its Chroma chunks."""
    for doc in db.query(Document).filter(Document.title == title).all():
        vectorstore.delete_document(doc.id)
        db.delete(doc)
    db.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the NGO demo knowledge base.")
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help=f"confidence_threshold to set for the demo (default {DEFAULT_THRESHOLD})",
    )
    args = parser.parse_args()

    init_db()
    db = SessionLocal()
    try:
        for filename in SEED_FILES:
            path = SEED_DIR / filename
            if not path.exists():
                print(f"  ! missing seed file: {path}")
                continue
            data = path.read_bytes()
            _purge_existing(db, filename)
            doc = ingest_document(db, filename, data)
            print(f"  + {filename}: status={doc.status} chunks={doc.chunk_count} bytes={doc.file_size}")

        setting = get_or_create_settings(db)
        setting.confidence_threshold = args.threshold
        db.commit()
        print(f"  = confidence_threshold set to {args.threshold}")
        print("Done. Knowledge base seeded.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
