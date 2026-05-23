"""SQLAlchemy engine, session factory, and Base (task 0.5).

Defaults to a local SQLite file so the DB is created on first run with no
external credentials. Set DATABASE_URL to point at Postgres if desired.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./backend.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()


def get_db():
    """FastAPI dependency: yields a session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create the DB file (if SQLite) and all tables. Idempotent."""
    from backend.models import tables  # noqa: F401  (registers models on Base)

    Base.metadata.create_all(bind=engine)
