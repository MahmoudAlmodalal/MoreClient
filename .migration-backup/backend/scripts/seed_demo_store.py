"""Load the Arabic demo store knowledge base for client demos.

Seeds demo_store_ar.md (Arabic e-commerce Q&A: greetings, prices, ordering,
shipping, warranty, contact info) so the Telegram bot can answer real questions.

Idempotent — deletes any prior document with the same name before re-ingesting.

Run from the repo root:
    python -m backend.scripts.seed_demo_store
"""

from pathlib import Path

from backend.models.database import SessionLocal, init_db
from backend.models.tables import Document, get_or_create_settings
from backend.services.ai import vectorstore
from backend.services.ingestion.ingest import ingest_document

SEED_DIR = Path(__file__).resolve().parents[1] / "seed"
SEED_FILE = "demo_store_ar.md"


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        path = SEED_DIR / SEED_FILE
        if not path.exists():
            print(f"  ! seed file not found: {path}")
            return

        # Remove any prior ingestion of this file to stay idempotent.
        for doc in db.query(Document).filter(Document.title == SEED_FILE).all():
            vectorstore.delete_document(doc.id)
            db.delete(doc)
        db.commit()

        data = path.read_bytes()
        doc = ingest_document(db, SEED_FILE, data)
        print(f"  + {SEED_FILE}: status={doc.status} chunks={doc.chunk_count}")

        # Lower threshold so Arabic semantic matches work reliably.
        s = get_or_create_settings(db)
        s.confidence_threshold = 0.35
        s.company_name = "متجر clientMORE"
        s.bot_name = "مساعد المتجر الذكي"
        db.commit()
        print("  = confidence_threshold=0.35, company/bot names updated")
        print("Done. Demo store knowledge base ready.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
