from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

raw_url = settings.DATABASE_URL
parsed_url = make_url(raw_url)
if parsed_url.drivername == "postgres":
    parsed_url = parsed_url.set(drivername="postgresql+asyncpg")
elif parsed_url.drivername == "postgresql" and "+asyncpg" not in str(parsed_url):
    parsed_url = parsed_url.set(drivername="postgresql+asyncpg")

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
