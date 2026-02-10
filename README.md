# Inbound Calling Agent Platform

Multi-tenant AI-powered inbound calling agent. Companies upload their knowledge base, configure services, and get an intelligent phone support agent.

## Architecture

```
├── frontend/    → Next.js 15 (React) – Admin dashboard & UI
├── backend/     → FastAPI (Python) – AI agents, RAG, Twilio integration
└── README.md
```

### Agent Pipeline

```
Incoming Call → Router Agent → Conversation Agent (RAG)
                            → Action Agent (booking/complaint/feedback)
```

| Agent | Role |
|-------|------|
| **Router** | Cleans query + determines intent (`information` / `action` / `unclear`) |
| **Conversation** | RAG-powered Q&A from company knowledge base via Pinecone |
| **Action** | Collects structured data for bookings, complaints, feedback |

## Quick Start

### Backend (Python)

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # configure API keys
uvicorn app.main:app --reload --port 8000
```

### Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
npm run dev
```

### Database Setup

```bash
cd frontend
npm run db:migrate   # creates multi-tenant schema
```

## API Endpoints (Backend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET/POST/PUT/DELETE` | `/api/companies` | Company CRUD |
| `GET/POST/DELETE` | `/api/knowledge` | Knowledge document management |
| `POST` | `/api/agent/process` | Process a customer query |
| `GET` | `/api/agent/greeting` | Get company greeting |

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: FastAPI, LangChain, SQLAlchemy (async)
- **LLM**: Cerebras (Llama 3.3 70B)
- **Vector DB**: Pinecone
- **Database**: PostgreSQL (Neon)
- **Telephony**: Twilio
- **STT/TTS**: Whisper / DeepGram
