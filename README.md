# Learn LM

A real-time voice-based AI tutoring platform. Pick a topic, have a spoken conversation with an AI tutor that uses course materials (RAG), with customizable voices and personas.

![Voice Agent](https://img.shields.io/badge/AI-Voice%20Tutor-purple)
![React](https://img.shields.io/badge/React-19-blue)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)
![Hono](https://img.shields.io/badge/Hono-v4-green)

## Features

- **Real-Time Voice Conversations**: Speak naturally with your AI tutor using Deepgram Whisper (STT) and Aura (TTS)
- **Course Integration**: RAG-powered responses using real course outlines
- **Interrupt Commands**: Say "Stop", "Wait", or "Hold on" to cancel TTS immediately
- **Clarification Requests**: Say "What?" or "I don't understand" to get simpler explanations
- **Progress Tracking**: Session history, transcripts, and learning progress saved to D1
- **Ultra-Low Latency**: Durable Objects with WebSocket hibernation for persistent connections

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account (for deployment)

### Interactive Setup (Recommended)

Run the interactive TUI setup wizard:

```bash
./scripts/setup-local.sh
```

This will guide you through:
- Installing dependencies (backend + frontend)
- Setting up the local D1 database
- Seeding sample data
- Configuring environment files
- Running verification tests

```
 _                            _     __  __ 
| |    ___  __ _ _ __ _ __   | |   |  \/  |
| |   / _ \/ _` | '__| '_ \  | |   | |\/| |
| |__|  __/ (_| | |  | | | | | |___| |  | |
|_____\___|\__,_|_|  |_| |_| |_____|_|  |_|

       AI Tutor - Development Setup

+---------------- Main Menu ----------------+
|                                           |
|   > Full Setup (recommended for first)    |
|     Install Dependencies Only             |
|     Setup Database Only                   |
|     Setup Environment Only                |
|     Run Verification Tests                |
|     Quick Actions                         |
|     Exit                                  |
|                                           |
+-------------------------------------------+
```

### Manual Setup

If you prefer manual setup:

```bash
# Clone the repo
git clone <repo-url>
cd xhacks2026

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Setup database
cd ../backend
npm run db:migrate:local
npm run db:seed:local

# Setup frontend environment
cd ../frontend
cp .env.example .env
```

### Start Development

```bash
# Terminal 1: Backend (http://localhost:8787)
cd backend && npm run dev

# Terminal 2: Frontend (http://localhost:5173)
cd frontend && npm run dev
```

## Architecture

```
+------------------+        +-----------------------+        +---------------------------+
|  Voice (STT/TTS) | <----> |   Text (Chat UI)      | <----> |   System/Persona Prompts  |
|  (browser/AI)    |        |   (React/Vite)        |        |   (template + rules)      |
+------------------+        +-----------------------+        +---------------------------+
        ^                               |                                   |
        |                               | HTTPS / WS                        |
        |                               v                                   |
        |                     +-----------------------+                     |
        |                     |  Cloudflare Pages     |                     |
        |                     |  (static web hosting) |                     |
        |                     +-----------------------+                     |
        |                               |                                   |
        |                               v                                   |
        |                     +-------------------------------+             |
        |                     |   Cloudflare Workers API      | <-----------+
        |                     | (routing, auth, orchestration)|
        |                     +-------------------------------+
        |                         |       |          |     |
        |                         |       |          |     |
        |         WebSocket       |       |          |     |  RAG / LLM calls
        |       (real-time chat)  |       |          |     v
        |                         |       |          |  +------------------+
        |                         |       |          |  |  Workers AI      |
        |                         |       |          |  |  - LLM chat      |
        |                         |       |          |  |  - STT/TTS       |
        |                         |       |          |  |  - embeddings    |
        |                         |       |          |  +------------------+
        |                         |       |          |
        |                         v       |          |
        |               +----------------------+     |
        |               | Durable Objects      |     |
        |               | VoiceTeacherSession  |     |
        |               | - session state      |     |
        |               | - turn-taking        |     |
        |               | - streaming replies  |     |
        |               +----------------------+     |
        |                         |                  |
        |                         | read/write       | vector search
        |                         v                  v
        |                 +---------------+     +------------------+
        |                 | D1 (SQLite)   |     | Vectorize Index  |
        |                 | - users       |     | - chunk vectors  |
        |                 | - courses     |     | - metadata       |
        |                 | - transcripts |     +------------------+
        |                 | - progress    |
        |                 +---------------+
        |                         ^
        |                         |
        |                         v
        |                 +---------------+
        |                 | KV            |
        |                 | - session TTL |
        |                 | - rate limit  |
        |                 | - cache       |
        |                 +---------------+
```

## Tech Stack

### Cloudflare Platform

| Service | Purpose | Binding |
|---------|---------|---------|
| **Workers** | Hono API + orchestration | - |
| **Workers AI** | STT, TTS, LLM, Embeddings | `AI` |
| **Durable Objects** | Voice session state + WebSocket hibernation | `VOICE_SESSION` |
| **D1** | Users, courses, transcripts, progress | `DB` |
| **Vectorize** | Course content embeddings (768 dims, cosine) | `VECTORIZE` |
| **KV** | Session cache, rate limits | `KV` |

### Workers AI Models

| Model | Purpose |
|-------|---------|
| `@cf/deepgram/whisper-large-v3-turbo` | Speech-to-Text |
| `@cf/deepgram/aura-1` | Text-to-Speech (11 voices) |
| `@cf/meta/llama-3.1-8b-instruct` | Text generation/tutoring |
| `@cf/baai/bge-base-en-v1.5` | 768-dim embeddings |

### Available Voices

| Voice | Style | Best For |
|-------|-------|----------|
| `asteria` | Warm, professional | General tutoring |
| `orion` | Deep, professional | Technical topics |
| `athena` | Confident, clear | Business, leadership |
| `angus` | British, refined | Literature, arts |
| `zeus` | Powerful, commanding | Motivation |
| + 6 more | Various styles | See `/api/voices` |

### Frontend
- React 19 + Vite
- Tailwind CSS v4
- TypeScript

### Backend
- **Hono** on Workers (nodejs_compat)
- TypeScript
- Durable Objects with WebSocket Hibernation

## Project Structure

```
├── scripts/
│   └── setup-local.sh        # Interactive TUI setup wizard
│
├── backend/
│   ├── src/
│   │   ├── index.ts          # Hono entry point + routes
│   │   ├── types.ts          # TypeScript types + Env bindings
│   │   ├── voices.ts         # Voice configuration
│   │   └── durable-objects/
│   │       └── voice-session.ts  # VoiceTeacherSession DO
│   ├── sql/
│   │   ├── schema.sql        # D1 database schema
│   │   └── seed.sql          # Sample data for development
│   ├── wrangler.jsonc        # Cloudflare configuration
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ui/           # UI components
    │   │   ├── customize/    # Voice/character selection
    │   │   └── layout/       # Layout components
    │   ├── pages/            # Route pages
    │   ├── hooks/            # React hooks
    │   └── data/             # Static data (voices, characters)
    └── package.json
```

## NPM Scripts

### Backend

```bash
npm run dev           # Start dev server (with DB migration)
npm run dev:only      # Start dev server (skip migration)
npm run test          # Run tests in watch mode
npm run test:run      # Run tests once
npm run db:migrate:local  # Run schema migrations locally
npm run db:seed:local     # Seed sample data locally
npm run db:reset:local    # Reset and seed database
npm run db:studio         # Open D1 Studio UI
npm run deploy            # Deploy to Cloudflare
```

### Frontend

```bash
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Voice Pipeline Flow

```
1. Student speaks → Microphone captures audio
2. Audio chunks → WebSocket → Durable Object
3. STT (Deepgram Whisper) → Transcript
4. Check for interrupt commands ("stop", "wait")
5. RAG query (Vectorize) → Relevant course content
6. LLM (Llama 3.1) → Generate response with context
7. TTS (Deepgram Aura) → Audio stream
8. Audio → WebSocket → Frontend playback
9. Transcript → D1 (async flush)
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | User accounts + preferences |
| `sfu_courses` | Cached course metadata |
| `sfu_outlines` | Course outlines (chunked for RAG) |
| `voice_sessions` | Active/completed sessions |
| `transcripts` | Conversation transcripts |
| `progress` | Learning progress per course |
| `instructors` | Instructor data with ratings |

## Deployment

```bash
cd backend
npx wrangler login    # Authenticate with Cloudflare
npx wrangler deploy   # Deploy to production
```

## License

MIT
