# Ollama Chatbot

A local chatbot powered by [Ollama](https://ollama.com), [LangChain](https://python.langchain.com), and a FastAPI backend with a React frontend.

## Prerequisites

- [Ollama](https://ollama.com/download) installed and running
- Python 3.11+
- Node.js 18+

Pull a model (default is `llama3.2`):

```bash
ollama pull llama3.2
```

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Configuration

Copy `backend/.env.example` to `backend/.env` and adjust:

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API URL |
| `OLLAMA_MODEL` | `llama3.2` | Model name |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed frontend origins |

## API

- `GET /api/health` — backend status and model info
- `POST /api/chat` — streaming chat (SSE). Body: `{ "messages": [{ "role": "user", "content": "..." }] }`

## Project structure

```
ollama-chatbot/
├── backend/
│   ├── app/
│   │   ├── main.py      # FastAPI routes
│   │   ├── chain.py     # LangChain + Ollama streaming
│   │   └── config.py    # Environment settings
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx      # Chat UI
        └── api/chat.js  # API client
```
