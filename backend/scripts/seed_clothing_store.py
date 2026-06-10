"""Load the Arabic clothing store demo KB for client demos.

Seeds clothing_store_ar.md (blouses, dresses, menswear — prices, sizes, ordering)
so the bot can answer real questions and demo the full purchase-to-sales-handoff flow.

Idempotent — deletes any prior document with the same name before re-ingesting.

Run from the repo root:
    python -m backend.scripts.seed_clothing_store
"""

from pathlib import Path

from backend.models.database import SessionLocal, init_db
from backend.models.tables import Document, get_or_create_settings
from backend.services.ai import vectorstore
from backend.services.ingestion.ingest import ingest_document

SEED_DIR = Path(__file__).resolve().parents[1] / "seed"
SEED_FILE = "clothing_store_ar.md"


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        path = SEED_DIR / SEED_FILE
        if not path.exists():
            print(f"  ! seed file not found: {path}")
            return

        for doc in db.query(Document).filter(Document.title == SEED_FILE).all():
            vectorstore.delete_document(doc.id)
            db.delete(doc)
        db.commit()

        data = path.read_bytes()
        doc = ingest_document(db, SEED_FILE, data)
        print(f"  + {SEED_FILE}: status={doc.status} chunks={doc.chunk_count}")

        s = get_or_create_settings(db)
        s.confidence_threshold = 0.35
        s.company_name = "متجر أناقة"
        s.bot_name = "مساعد أناقة الذكي"
        # Enable purchase flow so buy-intent → collect details → handoff to sales
        s.purchase_flow_enabled = True
        s.purchase_direct_handoff = True
        db.commit()
        print("  = confidence_threshold=0.35, purchase_flow=enabled, names updated")
        print("Done. Clothing store demo KB ready.")
        print()
        print("Demo scenarios:")
        print("  1. Ask price   → 'كم سعر البلوزة البيضاء؟'   → bot answers 95 ريال")
        print("  2. Ask sizes   → 'ما المقاسات المتوفرة؟'     → bot answers from KB")
        print("  3. Buy intent  → 'أريد أشتري البلوزة الحمراء' → purchase flow starts")
        print("  4. Confirm     → 'نعم'                        → handoff to sales team")
    finally:
        db.close()


if __name__ == "__main__":
    main()
