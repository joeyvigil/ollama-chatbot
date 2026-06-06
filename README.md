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

## Deploy on AWS

Run the same Docker Compose stack on an [EC2](https://aws.amazon.com/ec2/) instance. A GPU instance is strongly recommended for acceptable response times with local models.

### Requirements

- An AWS account with EC2 access
- An instance with **at least 16 GB RAM** (e.g. `t3.xlarge` for CPU-only testing, or `g4dn.xlarge` / `g5.xlarge` for GPU)
- Ubuntu 22.04 or 24.04 LTS AMI
- Security group allowing inbound **TCP 22** (SSH) and **TCP 8080** (or 80/443 if you add HTTPS)

### Launch and connect

1. In the EC2 console, launch an instance in your preferred region.
2. For GPU workloads, choose a **G4dn** or **G5** instance type and an AMI with NVIDIA drivers (or install drivers after boot on a standard Ubuntu AMI).
3. Attach a **gp3 EBS volume** (50 GB+ recommended) so model data persists across stop/start.
4. Assign an **Elastic IP** if you need a stable public address.
5. SSH in:

```bash
ssh -i your-key.pem ubuntu@<elastic-ip>
```

### Install Docker

On the instance:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and back in so the `docker` group applies.

For **NVIDIA GPU** instances, also install the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html), then uncomment the `deploy` block under `ollama` in `docker-compose.yml`.

### Deploy the app

```bash
git clone https://github.com/<your-org>/ollama-chatbot.git
cd ollama-chatbot
cp .env.docker.example .env
```

Edit `.env` for your public URL:

```bash
# Example: access via Elastic IP on port 8080
CORS_ORIGINS=http://<elastic-ip>:8080
HOST_PORT=8080
OLLAMA_MODEL=llama3.2
```

Start the stack and pull the model (first time only):

```bash
docker compose up -d --build
docker compose exec ollama ollama pull llama3.2
```

Open `http://<elastic-ip>:8080` in your browser.

### HTTPS (optional)

For production, put TLS in front of the app:

- **Application Load Balancer (ALB)** — target the instance on port 8080, attach an [ACM](https://aws.amazon.com/certificate-manager/) certificate, and set `CORS_ORIGINS` to `https://your-domain.com`.
- **On-instance** — install Caddy or Certbot in front of Docker, map port 443, and update `CORS_ORIGINS` accordingly.

Restrict the security group so port 8080 is not open to the world if traffic goes through the load balancer only.

### After reboot

```bash
cd ollama-chatbot
docker compose up -d
```

Containers use `restart: unless-stopped`; models stay in the `ollama_data` volume on the EBS disk.

---

## Deploy on GCP

Run Docker Compose on a [Compute Engine](https://cloud.google.com/compute) VM using the same steps as AWS.

### Requirements

- A GCP project with billing enabled
- A VM with **at least 16 GB RAM** (e.g. `e2-standard-4` for CPU-only testing, or `n1-standard-4` + **NVIDIA T4** for GPU)
- Ubuntu 22.04 or 24.04 LTS
- Firewall rules allowing **TCP 22** and **TCP 8080** (or 80/443 with HTTPS)

### Create the VM

Using [gcloud](https://cloud.google.com/sdk/docs/install):

```bash
# CPU-only example (slower inference)
gcloud compute instances create ollama-chatbot \
  --zone=us-central1-a \
  --machine-type=e2-standard-4 \
  --boot-disk-size=50GB \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=ollama-chatbot

# Allow HTTP traffic to the app port
gcloud compute firewall-rules create allow-ollama-chatbot \
  --allow=tcp:8080 \
  --target-tags=ollama-chatbot \
  --description="Ollama chatbot web UI"
```

For **GPU**, add `--accelerator=type=nvidia-tesla-t4,count=1` (quota permitting), install NVIDIA drivers on the VM, install the NVIDIA Container Toolkit, and enable the GPU block in `docker-compose.yml`.

SSH in:

```bash
gcloud compute ssh ollama-chatbot --zone=us-central1-a
```

Reserve a **static external IP** in VPC → IP addresses if you need a fixed endpoint.

### Install Docker

Same commands as the [AWS section](#install-docker) above.

### Deploy the app

```bash
git clone https://github.com/<your-org>/ollama-chatbot.git
cd ollama-chatbot
cp .env.docker.example .env
```

Set `.env` to your VM’s external IP or domain:

```bash
CORS_ORIGINS=http://<external-ip>:8080
HOST_PORT=8080
OLLAMA_MODEL=llama3.2
```

```bash
docker compose up -d --build
docker compose exec ollama ollama pull llama3.2
```

Open `http://<external-ip>:8080`.

### HTTPS (optional)

- **Google Cloud Load Balancing** — backend on port 8080, [managed SSL certificate](https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs) for your domain, update `CORS_ORIGINS` to `https://your-domain.com`.
- **On-VM** — Caddy or Certbot with a reverse proxy; close public access to 8080 if only 443 is exposed.

### After reboot

```bash
cd ollama-chatbot
docker compose up -d
```

The boot disk (or attached persistent disk) retains the `ollama_data` volume between restarts.

### Cloud cost note

Ollama runs large language models locally. GPU instances and sustained inference can be expensive. Stop or delete VMs when not in use, use smaller models for dev, and consider [Ollama Cloud](https://ollama.com/cloud) or a remote `OLLAMA_BASE_URL` if you do not need on-instance inference.

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

