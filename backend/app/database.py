from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import TypeDecorator, CHAR, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.config import settings
import logging
import uuid


class GUID(TypeDecorator):
    """Platform-independent GUID type that uses CHAR(32), storing as stringified hex values.
    Uses native UUID type in PostgreSQL and String in SQLite.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        
        if dialect.name == 'postgresql':
            return str(value)
        
        if not isinstance(value, uuid.UUID):
            return "%.32x" % uuid.UUID(value).int
        return "%.32x" % value.int

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        
        if not isinstance(value, uuid.UUID):
            value = uuid.UUID(value)
        return value


raw_url = settings.DATABASE_URL
parsed_url = make_url(raw_url)

try:
    # Normalize Postgres URLs from Render (which may start with postgres://)
    if parsed_url.drivername == "postgres":
        parsed_url = parsed_url.set(drivername="postgresql+asyncpg")
    elif parsed_url.drivername == "postgresql" and "+asyncpg" not in str(parsed_url):
        parsed_url = parsed_url.set(drivername="postgresql+asyncpg")
    
    logging.info("Database URL configured: %s (host=%s, driver=%s)", 
                 str(parsed_url).split("@")[0] if "@" in str(parsed_url) else str(parsed_url),
                 getattr(parsed_url, "host", "N/A"),
                 parsed_url.drivername)
except Exception:
    logging.exception("Error parsing DATABASE_URL; using SQLite")
    parsed_url = make_url("sqlite+aiosqlite:///./flowboard.db")

# Create engine with sensible defaults per backend
if "sqlite" in parsed_url.drivername:
    engine = create_async_engine(parsed_url, echo=False, future=True)
else:
    engine = create_async_engine(
        parsed_url,
        echo=False,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
    )

async_session = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


def switch_to_sqlite_fallback(db_path: str = "./flowboard.db"):
    """Replace the module-level engine and async_session with a local SQLite engine.

    This is safe to call at startup if a remote database connection fails.
    """
    global engine, async_session
    logging.warning("Switching to SQLite fallback at %s", db_path)
    sqlite_url = make_url(f"sqlite+aiosqlite:///{db_path}")
    engine = create_async_engine(sqlite_url, echo=False, future=True)
    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )


async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


