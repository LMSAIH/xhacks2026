# LearnLM

<p align="center">
  <img src="assets/logo.png" alt="LearnLM Logo" width="400" />
</p>

<p align="center">
  <strong>Learn from history's greatest minds</strong>
</p>

<p align="center">
  <a href="https://learn-lm.com">Live Demo</a> •
  <a href="docs/FEATURES.md">Features</a> •
  <a href="docs/API.md">API</a> •
  <a href="docs/MCP.md">MCP Server</a>
</p>

---

An AI-powered tutoring platform where you learn from history's greatest minds. Select a topic, choose an AI tutor modeled after a historical figure, and learn through natural voice conversations.

> Built by **Team The Smurfs** for **SystemHacks:XHacks 2026** — SFU's SSSS Hackathon

## Overview

LearnLM reimagines education by bringing historical figures back to life as AI tutors. Imagine learning physics from Einstein, programming from Ada Lovelace, or scientific method from Marie Curie. The platform features real-time voice tutoring, AI-generated course outlines, a notes editor with intelligent assistance, and integration with SFU course materials.

## Key Features

- **Historical AI Tutors** - Learn from Einstein, Feynman, Curie, Ada Lovelace, Socrates, and more
- **Voice Tutoring** - Natural spoken conversations with real-time speech-to-text and text-to-speech
- **Custom Characters** - Create any tutor persona (real, fictional, or imaginary)
- **Course Outlines** - AI-generated curriculum with streaming progressive rendering
- **Notes Editor** - Rich text editor with slash commands for AI assistance
- **RAG Integration** - Responses grounded in actual course materials
- **SFU Courses** - Direct integration with 998 Simon Fraser University courses

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account (for deployment)

### Installation

```bash
# Clone repository
git clone https://github.com/LMSAIH/xhacks2026.git
cd xhacks2026

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Setup database
cd ../backend
npm run db:migrate:local
npm run db:seed:local

# Configure environment
cd ../frontend
cp .env.example .env
```

### Development

```bash
# Terminal 1: Backend (port 8787)
cd backend && npm run dev

# Terminal 2: Frontend (port 5173)
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Architecture

LearnLM runs entirely on Cloudflare's developer platform:

| Component | Technology | Purpose |
|-----------|------------|---------|
| Compute | Cloudflare Workers | API routing, orchestration |
| State | Durable Objects | WebSocket voice sessions |
| Database | D1 (SQLite) | Users, courses, transcripts |
| Cache | KV | Session data, rate limits |
| Search | Vectorize | RAG embeddings |
| AI | Workers AI | LLM, STT, TTS, embeddings |
| Voice | ElevenLabs | Conversational AI voice |
| Frontend | Cloudflare Pages | Static hosting |

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## AI Models

| Model | Provider | Purpose |
|-------|----------|---------|
| Llama 3.1 8B | Workers AI | Text generation, tutoring |
| Whisper Large v3 | Workers AI | Speech-to-text |
| Deepgram Aura | Workers AI | Text-to-speech (11 voices) |
| BGE Base EN | Workers AI | Embeddings (768 dim) |
| FLUX.1 Schnell | Workers AI | Image generation |
| ElevenLabs | ElevenLabs API | Conversational voice AI |

For complete AI documentation, see [docs/AI.md](docs/AI.md).

## Project Structure

```
xhacks2026/
├── backend/
│   ├── src/
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # Business logic
│   │   └── durable-objects/  # Voice session state
│   ├── sql/                  # Database schema
│   └── wrangler.jsonc        # Cloudflare config
├── frontend/
│   ├── src/
│   │   ├── pages/            # Route pages
│   │   ├── components/       # React components
│   │   └── hooks/            # Custom hooks
│   └── vite.config.ts
├── docker/
│   └── mcp-server/           # MCP server (optional)
└── docs/                     # Documentation
```

## MCP Server Integration

LearnLM includes an MCP server that integrates with AI coding assistants (VS Code, Cursor, Claude Desktop, OpenCode). Get tutoring help, search courses, and critique notes directly from your IDE.

### Quick Setup (Remote)

Use our hosted MCP server - no local setup required:

```json
{
  "mcp": {
    "servers": {
      "learnlm": {
        "type": "http",
        "url": "https://mcp.learn-lm.com/mcp"
      }
    }
  }
}
```

**20 tools available:** Tutoring sessions, course search, prerequisite lookup, document critique, note suggestions, voice selection, and more.

For detailed setup instructions, see [docs/MCP.md](docs/MCP.md).

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, databases, data flow |
| [API.md](docs/API.md) | REST API endpoint reference |
| [MCP.md](docs/MCP.md) | MCP server setup and tools |
| [AI.md](docs/AI.md) | AI models and configuration |
| [FEATURES.md](docs/FEATURES.md) | Feature descriptions |

## API Reference

The backend exposes a REST API with WebSocket support for voice sessions.

**Base URL**: `https://sfu-ai-teacher.email4leit.workers.dev`

Key endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courses` | Search courses |
| GET | `/api/experts` | Generate AI tutors |
| GET | `/api/outlines/generate/stream` | Stream course outline (SSE) |
| WS | `/api/voice/:courseCode` | Voice tutoring session |
| POST | `/api/editor-chat` | Editor chat with slash commands |

For complete API documentation, see [docs/API.md](docs/API.md).

## Deployment

### Backend

```bash
cd backend
npx wrangler login
npx wrangler deploy
```

### Frontend

```bash
cd frontend
npm run build
npx wrangler pages deploy dist
```

### Environment Variables

**Backend** (set via `wrangler secret put`):
- `ELEVENLABS_API_KEY` - ElevenLabs API key for voice

**Frontend** (.env):
```
VITE_BACKEND_URL=https://your-worker.workers.dev
```

## Development Scripts

### Backend

```bash
npm run dev              # Start development server
npm run deploy           # Deploy to Cloudflare
npm run db:migrate:local # Run database migrations
npm run db:seed:local    # Seed sample data
npm run db:studio        # Open D1 Studio
```

### Frontend

```bash
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Team

**The Smurfs** - SystemHacks:XHacks 2026

Built at Simon Fraser University's SSSS (Software Systems Student Society) Hackathon.

## License

MIT
