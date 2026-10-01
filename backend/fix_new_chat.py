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
        stmt = select(ChatSession).where(ChatSession.title.ilike("New chat"))
        result = await session.execute(stmt)
        sessions = result.scalars().all()
        
        count = 0
        for s in sessions:
            msg_stmt = select(ChatMessage).where(ChatMessage.session_id == s.id, ChatMessage.role == "USER").order_by(ChatMessage.created_at.asc()).limit(1)
            msg_result = await session.execute(msg_stmt)
            first_msg = msg_result.scalars().first()
            if first_msg:
                content = first_msg.content
                new_title = content[:30].strip()
                if len(content) > 30:
                    new_title += "..."
                s.title = new_title.upper()
                count += 1
            else:
                s.title = "NEW CHAT"
            
        await session.commit()
        print(f"Updated {count} chat sessions that had messages, reset others to 'NEW CHAT'")

if __name__ == "__main__":
    asyncio.run(main())
