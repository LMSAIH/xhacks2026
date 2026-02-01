# LearnLM

An AI-powered tutoring platform with real-time voice conversations. Select a topic, choose an AI tutor character, and learn through natural spoken dialogue.

**Live Demo**: [learn-lm.com](https://learn-lm.com)

## Overview

LearnLM enables personalized learning through AI tutors that adapt to your learning style. Features include voice-based tutoring, AI-generated course outlines, a notes editor with intelligent assistance, and integration with SFU course materials.

## Key Features

- **Voice Tutoring** - Natural spoken conversations with AI tutors using real-time speech-to-text and text-to-speech
- **Custom AI Characters** - Learn from historical figures or create custom tutor personas
- **Course Outlines** - AI-generated curriculum with streaming progressive rendering
- **Notes Editor** - Rich text editor with slash commands and background critique
- **RAG Integration** - Responses grounded in actual course materials
- **SFU Courses** - Direct integration with 998 Simon Fraser University courses

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account (for deployment)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/learnlm.git
cd learnlm

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

For complete AI documentation, see [docs/AI.md](docs/AI.md).

## Project Structure

```
learnlm/
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

### Quick Setup (Remote - Recommended)

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

### Local Setup (Self-Hosted)

1. **Build the server:**
   ```bash
   cd docker/mcp-server
   npm install && npm run build
   ```

2. **Add to VS Code** (settings.json):
   ```json
   {
     "mcp": {
       "servers": {
         "learnlm": {
           "command": "node",
           "args": ["/path/to/learnlm/docker/mcp-server/dist/index.js"],
           "env": {
             "OPENAI_API_KEY": "sk-your-key"
           }
         }
       }
     }
   }
   ```

3. **Use in chat:** `@learnlm search for CMPT 225`

**20 tools available:** Tutoring sessions, course search, prerequisite lookup, document critique, note suggestions, voice selection, and more.

For detailed setup instructions for all IDEs, see [docs/MCP.md](docs/MCP.md).

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, databases, data flow |
| [API.md](docs/API.md) | REST API endpoint reference |
| [MCP.md](docs/MCP.md) | MCP server setup and tools |
| [AI.md](docs/AI.md) | AI models and configuration |
| [FEATURES.md](docs/FEATURES.md) | Feature descriptions and roadmap |

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

**Backend** (set in Cloudflare dashboard or wrangler.jsonc):
- Bindings: `DB`, `KV`, `VECTORIZE`, `AI`, `VOICE_SESSION`, `EDITOR_VOICE`

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

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/name`)
3. Commit changes (`git commit -am 'Add feature'`)
4. Push to branch (`git push origin feature/name`)
5. Open a Pull Request

## License

MIT
