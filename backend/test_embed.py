import asyncio
from app.services import vector_service

async def main():
    try:
        print("Starting embed test...")
        texts = ["hello world", "this is a test"]
        result = await vector_service.get_embeddings_batch(texts)
        print("Success! Generated embeddings of size:", len(result), "x", len(result[0]))
    except Exception as e:
        print("FAILED:", str(e))

if __name__ == "__main__":
    asyncio.run(main())
