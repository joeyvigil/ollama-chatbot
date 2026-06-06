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

## Deploy with Docker

The easiest way to run everything in production is Docker Compose (Ollama + backend + nginx frontend).

**Requirements:** [Docker](https://docs.docker.com/get-docker/) and Docker Compose.

### First-time setup

From the project root:

```bash
cp .env.docker.example .env   # optional: adjust model, port, CORS
docker compose up -d --build
docker compose exec ollama ollama pull llama3.2
```

Open http://localhost:8080 (or the port set in `HOST_PORT`).

You only need to pull the model once. It is saved in a Docker volume and persists across restarts.

### Start again after shutting down your computer

After you turn your computer back on, start the chatbot again from the project root:

```bash
cd /path/to/ollama-chatbot
docker compose up -d
```

No rebuild or model pull is needed unless you changed the code or deleted the volume.

Containers are set to `restart: unless-stopped`, so they may start automatically when Docker boots. If the site does not load, run `docker compose up -d` manually.

Open http://localhost:8080 on this machine. Other devices on the same network can use `http://<your-lan-ip>:8080` (find your IP with `ip -4 addr show scope global`).

### Stop the chatbot

```bash
docker compose down
```

Model data is kept in the `ollama_data` volume. To remove it as well: `docker compose down -v`.

### Docker configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_MODEL` | `llama3.2` | Model to use (must be pulled in the Ollama container) |
| `HOST_PORT` | `8080` | Port exposed on the host |
| `CORS_ORIGINS` | `http://localhost:8080` | Allowed origins if the API is accessed directly |

For NVIDIA GPU support, uncomment the `deploy` block under the `ollama` service in `docker-compose.yml`.

## Project structure

```
ollama-chatbot/
├── backend/
│   ├── app/
│   │   ├── main.py      # FastAPI routes
│   │   ├── chain.py     # LangChain + Ollama streaming
│   │   └── config.py    # Environment settings
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx      # Chat UI
│       └── api/chat.js  # API client
└── docker-compose.yml
```

