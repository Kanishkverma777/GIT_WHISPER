# GIT WHISPER

> An AI-powered workspace to securely chat, search, and analyze your GitHub repositories in real-time.

![Git Whisper Architecture](https://img.shields.io/badge/Architecture-RAG-blue.svg)
![Frontend](https://img.shields.io/badge/Frontend-Next.js_16-black)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688)
![Database](https://img.shields.io/badge/Database-Neon_PostgreSQL-30a2ff)
![Vector DB](https://img.shields.io/badge/Vector-Qdrant-red)

Git Whisper is a production-grade Retrieval-Augmented Generation (RAG) system for your code. It allows you to authenticate with GitHub, index any repository you own, and instantly ask natural language questions about your codebase. 

---

## 🏗 System Architecture

Git Whisper uses a decoupled client-server RAG architecture optimized for speed, cost-efficiency, and deployment on edge/serverless infrastructure.

### The Stack
- **Frontend:** Next.js 16 (React 19), Tailwind CSS v4, React Query, and Shadcn for a high-performance, industrial-brutalist UI.
- **Backend:** FastAPI (Python) running asynchronously.
- **Relational Database:** Neon Serverless PostgreSQL for user sessions, repository metadata, and sync states.
- **Vector Database:** Qdrant Cloud for high-dimensional code embedding storage and similarity search.
- **Embeddings (Local AI):** `fastembed` (`sentence-transformers/all-MiniLM-L6-v2`) running completely locally on the backend to avoid 3rd-party embedding API costs.
- **LLM Engine:** Groq API (Llama 3) for lightning-fast token generation.

### Architecture Flowchart

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': 'transparent' }}}%%
graph TD
    %% Make all nodes transparent by default
    classDef default fill:transparent,stroke:#888,stroke-width:2px,color:inherit;

    %% Subgraph styling to remove gray backgrounds
    style Frontend fill:transparent,stroke:#555,stroke-width:2px,stroke-dasharray: 5 5
    style Backend fill:transparent,stroke:#555,stroke-width:2px,stroke-dasharray: 5 5

    %% Users
    User((User))
    
    %% Frontend
    subgraph Frontend [Next.js Client]
        UI[Dashboard UI]
        Chat[Chat Interface]
    end
    
    %% Backend
    subgraph Backend [FastAPI Server]
        Auth[GitHub OAuth]
        Zip[Zipball Downloader]
        Filter[Filter & Chunker]
        Embed[fastembed Local Model]
        RAG[RAG Retrieval Engine]
    end
    
    %% External Services
    GitHub[(GitHub API)]
    Neon[(Neon PostgreSQL)]
    Qdrant[(Qdrant Vector DB)]
    Groq((Groq Llama 3))
    
    %% Flow Links
    User -->|Login| UI
    UI --> Auth
    Auth <-->|Fetch Repos| GitHub
    Auth -->|Store Metadata| Neon
    
    UI -->|Trigger Indexing| Zip
    Zip -->|Download Archive| GitHub
    Zip --> Filter
    Filter -->|Batch Code Chunks| Embed
    Embed -->|Upsert Vectors| Qdrant
    
    User -->|Asks Question| Chat
    Chat --> RAG
    RAG -->|Embed Query| Embed
    RAG <-->|Top-K Search| Qdrant
    RAG -->|Context + Prompt| Groq
    Groq -.->|Stream Response| Chat
```

---

## 🔄 Core Flows

### 1. Authentication & Sync
- User authenticates via **GitHub OAuth App**.
- Backend generates a secure session and syncs the user's available repositories using the GitHub REST API.
- Repository metadata is stored in **Neon PostgreSQL**.

### 2. Repository Indexing Pipeline
When a user clicks "Index" on a repository:
1. **Archive Retrieval:** The backend fetches the entire repository structure as a single ZIP archive from GitHub to minimize API limits and latency.
2. **In-Memory Extraction & Filtering:** The archive is unzipped in memory. Aggressive heuristics filter out unhelpful assets (`node_modules`, minified files, lockfiles, images).
3. **Semantic Chunking:** Valid source code is split into overlapping chunks to preserve context boundaries.
4. **Local Embedding (OOM-Safe):** Chunks are processed in controlled micro-batches (size=32) using the local `fastembed` model. This strict batching ensures stability and prevents Out-Of-Memory (OOM) crashes on constrained infrastructure (like Render's 512MB free tier).
5. **Vector Upsertion:** Vectors and code payloads are pushed to **Qdrant**.

### 3. Chat & Retrieval (RAG)
When a user asks a question:
1. **Query Embedding:** The user's prompt is embedded locally using the same `fastembed` model.
2. **Semantic Search:** The backend queries Qdrant to find the top `K` most semantically relevant code chunks from that specific repository.
3. **LLM Generation:** The retrieved chunks are injected as context into a prompt, which is sent to the **Groq API**.
4. **Streaming Response:** Groq streams the generated Markdown response back to the Next.js client in real-time.

---

## 🚀 Getting Started (Development)

### Prerequisites
- Node.js 20+
- Python 3.11+
- [uv](https://github.com/astral-sh/uv) (Python package manager)
- Accounts/API Keys for: GitHub OAuth, Qdrant Cloud, Neon, Groq.

### 1. Backend Setup
```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
```
Set up your `.env` in the `backend/` directory:
```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_secure_jwt_secret
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://user:pass@ep-rest-of-url.neon.tech/neondb
QDRANT_URL=https://your-cluster.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_key
GROQ_API_KEY=your_groq_key
```
Run the FastAPI server:
```bash
uvicorn app.main:app --reload --port 8080
```

### 2. Frontend Setup
```bash
cd client
npm install
```
Set up your `.env.local` in the `client/` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```
Run the Next.js development server:
```bash
npm run dev
```

---

## 🌐 Production Deployment

### Frontend (Vercel)
1. Import the `client/` directory into Vercel.
2. Set the `NEXT_PUBLIC_API_URL` environment variable to your deployed backend URL.
3. Ensure Build Command is `npm run build` and Output Directory is `.next`.

### Backend (Render)
1. Connect the repository to a Render Web Service.
2. Set the Root Directory to `backend/`.
3. Set the Build Command to: `pip install -r requirements.txt`
4. Set the Start Command to: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Populate all environment variables from your local `.env`.
6. Ensure the GitHub OAuth App callback URL is updated to point to the new Render URL (e.g., `https://git-whisper.onrender.com/api/auth/github/callback`).

---

## 🔒 Security & Performance Considerations
- **No Raw Tokens Stored:** GitHub Access Tokens are used for session-based operations.
- **Local Embeddings:** Prevents source code from being sent to OpenAI for embedding, dramatically increasing privacy and reducing operational costs.
- **Memory Management:** The indexing loop is heavily tuned to respect strict RAM limits (e.g., 512MB) by chunking and batching vector computations safely.
- **Resiliency:** Stuck indexing jobs (e.g., due to an unexpected server restart) can be easily re-triggered and will overwrite old vectors gracefully.
