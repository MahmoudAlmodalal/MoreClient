"""Reset and seed the isolated database used by browser E2E tests.

The script deliberately refuses to operate on a non-E2E SQLite URL. It is safe to
run before every local or CI browser test job.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

# Set the database URL before importing backend modules because the SQLAlchemy
# engine is created at import time.
database_url = os.environ.get(
    "E2E_DATABASE_URL", "sqlite:////tmp/moreclient-e2e.sqlite3"
)
os.environ["DATABASE_URL"] = database_url
os.environ.setdefault("ENV", "prod")
os.environ.setdefault("APP_SECRET", "e2e-app-secret")
os.environ.setdefault("ADMIN_API_KEY", "e2e-admin-key")

if not database_url.startswith("sqlite:///") or "e2e" not in database_url.lower():
    raise SystemExit("E2E_DATABASE_URL must be an isolated SQLite URL containing 'e2e'.")

from backend.core.security import hash_password  # noqa: E402
from backend.models.database import Base, SessionLocal, engine, init_db  # noqa: E402
from backend.models.tables import (  # noqa: E402
    AuthUser,
    Conversation,
    PurchaseOrder,
    Tenant,
)


def sqlite_path(url: str) -> Path:
    raw_path = url.removeprefix("sqlite:///")
    return Path(raw_path).expanduser().resolve()


def seed() -> None:
    db_path = sqlite_path(database_url)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    engine.dispose()
    if db_path.exists():
        db_path.unlink()

    init_db()
    db = SessionLocal()
    try:
        north = Tenant(
            tenant_key="e2e-north",
            name="E2E North",
            email="e2e.north@example.test",
            plan="pro",
            status="active",
            limit_messages=500,
        )
        south = Tenant(
            tenant_key="e2e-south",
            name="E2E South",
            email="e2e.south@example.test",
            plan="ultra",
            status="active",
            limit_messages=1500,
        )
        db.add_all([north, south])
        db.flush()

        db.add_all(
            [
                AuthUser(
                    email="e2e.admin@example.test",
                    name="E2E Admin",
                    password_hash=hash_password("E2eAdmin!2026"),
                    role="admin",
                ),
                AuthUser(
                    email="e2e.north@example.test",
                    name="E2E North Admin",
                    password_hash=hash_password("E2eNorth!2026"),
                    role="company",
                    tenant_key=north.tenant_key,
                ),
                AuthUser(
                    email="e2e.south@example.test",
                    name="E2E South Admin",
                    password_hash=hash_password("E2eSouth!2026"),
                    role="company",
                    tenant_key=south.tenant_key,
                ),
            ]
        )

        north_conversation_one = Conversation(
            channel="web", tenant_key=north.tenant_key, customer_ref="north-customer-1"
        )
        north_conversation_two = Conversation(
            channel="web", tenant_key=north.tenant_key, customer_ref="north-customer-2"
        )
        south_conversation = Conversation(
            channel="web", tenant_key=south.tenant_key, customer_ref="south-customer-1"
        )
        db.add_all([north_conversation_one, north_conversation_two, south_conversation])
        db.flush()

        db.add_all(
            [
                PurchaseOrder(
                    conversation_id=north_conversation_one.id,
                    customer_ref="north-customer-1",
                    product_name="Starter package",
                    quantity=1,
                    delivery_address="North address",
                    status="pending",
                    state="collecting_product",
                    order_data={"source": "e2e"},
                ),
                PurchaseOrder(
                    conversation_id=north_conversation_two.id,
                    customer_ref="north-customer-2",
                    product_name="Premium package",
                    quantity=2,
                    delivery_address="North second address",
                    status="confirmed",
                    state="confirmed",
                    order_data={"source": "e2e"},
                ),
                PurchaseOrder(
                    conversation_id=south_conversation.id,
                    customer_ref="south-customer-1",
                    product_name="South-only package",
                    quantity=1,
                    delivery_address="South address",
                    status="pending",
                    state="collecting_product",
                    order_data={"source": "e2e"},
                ),
            ]
        )
        db.commit()
    finally:
        db.close()

    print(f"Seeded isolated E2E database: {db_path}")


if __name__ == "__main__":
    seed()
