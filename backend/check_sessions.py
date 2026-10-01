import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.config import settings
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage

async def main():
    engine = create_async_engine(settings.database_url)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as session:
        stmt = select(ChatSession)
        result = await session.execute(stmt)
        sessions = result.scalars().all()
        
        for s in sessions:
            print(f"[{s.id}] {s.title}")
            
if __name__ == "__main__":
    asyncio.run(main())
