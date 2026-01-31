# 🎓 SFU AI Teacher/Tutor

A real-time voice-based AI tutoring platform for SFU students. Pick a course, have a spoken conversation with an AI teacher that uses course data from the SFU Courses API (RAG), with interrupt/clarification commands and progress tracking.

![Voice Agent](https://img.shields.io/badge/AI-Voice%20Tutor-purple)
![React](https://img.shields.io/badge/React-19-blue)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)
![Express.js](https://img.shields.io/badge/Express.js-Workers-green)

## ✨ Features

- **🎙️ Real-Time Voice Conversations**: Speak naturally with your AI tutor using Deepgram Nova-3 (STT) and Aura-1 (TTS)
- **📚 SFU Course Integration**: RAG-powered responses using real course outlines, reviews, and content from SFU Courses API
- **🛑 Interrupt Commands**: Say "Stop", "Wait", or "Hold on" to cancel TTS immediately
- **🔄 Clarification Requests**: Say "What?", "Explain again", or "I don't understand" to get simpler explanations
- **📊 Progress Tracking**: Session history, transcripts, and learning progress saved to D1
- **⚡ Ultra-Low Latency**: Durable Objects with WebSocket hibernation for persistent, fast connections
- **🎯 Smart Turn Detection**: Uses \`@cf/pipecat-ai/smart-turn-v2\` for natural conversation flow

## 🏗️ Architecture

\`\`\`
┌─────────────────┐    WebSocket    ┌─────────────────────────────────────────────────┐
│                 │ ◄─────────────► │              Cloudflare Workers                 │
│  React Frontend │                 │                                                 │
│  (Vite + Shadcn)│                 │  ┌─────────────┐     ┌──────────────────────┐  │
│                 │                 │  │ Express.js  │────►│  VoiceTeacherSession │  │
└─────────────────┘                 │  │   Router    │     │   (Durable Object)   │  │
                                    │  └─────────────┘     └──────────────────────┘  │
                                    │         │                      │               │
                                    │         ▼                      ▼               │
                                    │  ┌─────────────┐     ┌──────────────────────┐  │
                                    │  │     D1      │     │     Workers AI       │  │
                                    │  │  Database   │     │  STT/TTS/LLM/Embed   │  │
                                    │  └─────────────┘     └──────────────────────┘  │
                                    │         │                      │               │
                                    │         ▼                      ▼               │
                                    │  ┌─────────────┐     ┌──────────────────────┐  │
                                    │  │     KV      │     │     Vectorize        │  │
                                    │  │   Cache     │     │   Course Embeddings  │  │
                                    │  └─────────────┘     └──────────────────────┘  │
                                    └─────────────────────────────────────────────────┘
                                                         │
                                                         ▼
                                    ┌─────────────────────────────────────────────────┐
                                    │              SFU Courses API                    │
                                    │         https://api.sfucourses.com              │
                                    └─────────────────────────────────────────────────┘
\`\`\`

## 🛠️ Tech Stack

### Cloudflare Platform
| Service | Purpose | Binding |
|---------|---------|---------|
| **Workers** | Express.js API + orchestration | - |
| **Workers AI** | STT, TTS, LLM, Embeddings, Turn Detection | \`AI\` |
| **Durable Objects** | Voice session state + WebSocket hibernation | \`VOICE_SESSION\` |
| **D1** | Users, courses, transcripts, progress | \`DB\` |
| **Vectorize** | Course content embeddings (768 dims, cosine) | \`VECTORIZE\` |
| **KV** | Session cache, rate limits, API cache | \`KV\` |
| **AI Gateway** | Real-time STT/TTS WebSocket connections | Gateway URL |

### Workers AI Models
| Model | Purpose |
|-------|---------|
| \`@cf/deepgram/nova-3\` | Real-time Speech-to-Text |
| \`@cf/deepgram/aura-1\` | Real-time Text-to-Speech |
| \`@cf/meta/llama-3.1-8b-instruct\` | Text generation/tutoring |
| \`@cf/baai/bge-base-en-v1.5\` | 768-dim embeddings |
| \`@cf/pipecat-ai/smart-turn-v2\` | Voice turn detection |

### Frontend
- React 19 + Vite
- Tailwind CSS v4
- Shadcn UI
- TypeScript

### Backend
- Express.js on Workers (nodejs_compat)
- TypeScript
- Durable Objects with WebSocket Hibernation

## 📁 Project Structure

\`\`\`
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express.js entry point
│   │   ├── types.ts              # TypeScript types + Env bindings
│   │   ├── durable-objects/
│   │   │   └── voice-session.ts  # VoiceTeacherSession DO
│   │   ├── routes/
│   │   │   ├── auth.ts           # Authentication routes
│   │   │   ├── courses.ts        # SFU courses proxy + search
│   │   │   ├── voice.ts          # WebSocket upgrade handler
│   │   │   └── progress.ts       # Learning progress endpoints
│   │   ├── services/
│   │   │   ├── sfu-api.ts        # SFU Courses API client
│   │   │   ├── rag.ts            # Vectorize RAG service
│   │   │   ├── voice-pipeline.ts # STT → LLM → TTS pipeline
│   │   │   └── ingestion.ts      # Course data ingestion
│   │   └── utils/
│   │       ├── cors.ts           # CORS middleware
│   │       └── rate-limit.ts     # KV-based rate limiting
│   ├── sql/
│   │   └── schema.sql            # D1 database schema
│   ├── scripts/
│   │   └── setup.sh              # Infrastructure setup script
│   ├── wrangler.jsonc            # Cloudflare configuration
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ui/               # Shadcn UI components
    │   │   ├── voice-agent.tsx   # Main voice interface
    │   │   ├── course-selector.tsx
    │   │   ├── transcript-display.tsx
    │   │   └── progress-dashboard.tsx
    │   ├── hooks/
    │   │   ├── use-realtime-voice.ts
    │   │   └── use-courses.ts
    │   └── lib/
    │       └── api.ts            # API client
    └── package.json
\`\`\`

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare account with Workers Paid plan (for Durable Objects)
- Wrangler CLI (\`npm install -g wrangler\`)

### 1. Clone and Install

\`\`\`bash
git clone <repo-url>
cd xhacks2026

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
\`\`\`

### 2. Cloudflare Infrastructure Setup

\`\`\`bash
cd backend

# Login to Cloudflare
npx wrangler login

# Run the setup script (creates D1, KV, Vectorize)
chmod +x scripts/setup.sh
./scripts/setup.sh

# Or manually:
# Create D1 database
npx wrangler d1 create sfu-ai-teacher-db

# Create KV namespace
npx wrangler kv namespace create SFU_KV

# Create Vectorize index
npx wrangler vectorize create sfu-course-index --dimensions=768 --metric=cosine

# Create metadata indexes for filtering
npx wrangler vectorize create-metadata-index sfu-course-index --propertyName=course_code --type=string
npx wrangler vectorize create-metadata-index sfu-course-index --propertyName=content_type --type=string

# Apply D1 schema
npx wrangler d1 execute sfu-ai-teacher-db --local --file=sql/schema.sql
\`\`\`

### 3. Configure wrangler.jsonc

Update \`backend/wrangler.jsonc\` with your resource IDs from the setup output.

### 4. Start Development

\`\`\`bash
# Terminal 1: Backend
cd backend
npm run dev
# Runs at http://localhost:8787

# Terminal 2: Frontend
cd frontend
npm run dev
# Runs at http://localhost:5173
\`\`\`

### 5. Ingest SFU Course Data

\`\`\`bash
# Sync courses from SFU API to D1 + Vectorize
curl -X POST http://localhost:8787/api/admin/ingest\?term\=1251
\`\`\`

## 🔧 Configuration

### Environment Variables

Update \`wrangler.jsonc\` with your configuration:

\`\`\`jsonc
{
  "vars": {
    "ENVIRONMENT": "development",
    "AI_GATEWAY_ACCOUNT_ID": "your-account-id",
    "AI_GATEWAY_NAME": "sfu-ai-teacher"
  }
}
\`\`\`

### Voice Settings

Customize the AI tutor in \`backend/src/services/voice-pipeline.ts\`:

\`\`\`typescript
const TUTOR_SYSTEM_PROMPT = \`You are an expert SFU course tutor...\`;

const TTS_CONFIG = {
  voice: 'aura-asteria-en',  // Options: luna, asteria, athena, apollo, arcas, orion
  sampleRate: 24000,
};
\`\`\`

## 📊 D1 Database Schema

| Table | Purpose |
|-------|---------|
| \`users\` | User accounts + preferences |
| \`sfu_courses\` | Cached course metadata |
| \`sfu_outlines\` | Full course outlines (chunked) |
| \`voice_sessions\` | Active/completed sessions |
| \`transcripts\` | Conversation transcripts |
| \`progress\` | Learning progress per course |

## 🎯 Voice Pipeline Flow

\`\`\`
1. Student speaks → Microphone captures audio
2. Audio chunks → WebSocket → Durable Object
3. STT (Nova-3) → Transcript
4. Check for interrupt commands ("stop", "wait")
5. RAG query (Vectorize) → Relevant course content
6. LLM (Llama 3.1) → Generate response with context
7. TTS (Aura-1) → Audio stream
8. Audio → WebSocket → Frontend playback
9. Transcript → D1 (async flush)
\`\`\`

## 🚢 Deployment

### Deploy Backend to Cloudflare

\`\`\`bash
cd backend

# Deploy to production
npx wrangler deploy

# Set up production D1 schema
npx wrangler d1 execute sfu-ai-teacher-db --remote --file=sql/schema.sql
\`\`\`

### Deploy Frontend to Cloudflare Pages

\`\`\`bash
cd frontend

# Build
npm run build

# Deploy (or connect to GitHub for auto-deploy)
npx wrangler pages deploy dist --project-name=sfu-ai-teacher
\`\`\`

## 👥 Team Structure (5 People)

| Role | Responsibilities |
|------|-----------------|
| **Infrastructure Lead** | Cloudflare setup, Durable Objects, voice pipeline, Vectorize |
| **Backend Dev 1** | SFU API integration, RAG, ingestion pipeline |
| **Backend Dev 2** | Auth, rate limiting, progress tracking |
| **Frontend Dev 1** | Voice UI, WebSocket handling, audio processing |
| **Frontend Dev 2** | Course pages, UX, styling, progress dashboard |

## ✅ Implementation Checklist

### Phase 1: Infrastructure (Hours 1-2)
- [ ] Project structure created
- [ ] wrangler.jsonc configured with resource IDs
- [ ] D1 database created + schema applied
- [ ] KV namespace created
- [ ] Vectorize index created with metadata indexes
- [ ] AI Gateway created (optional)
- [ ] Local dev working

### Phase 2: Core Backend (Hours 2-4)
- [ ] Express.js routes implemented
- [ ] Durable Object voice session working
- [ ] STT → LLM → TTS pipeline working
- [ ] Basic WebSocket handling

### Phase 3: SFU Integration (Hours 4-5)
- [ ] SFU API client implemented
- [ ] Course data ingested to D1
- [ ] Embeddings generated and stored in Vectorize
- [ ] RAG retrieval working

### Phase 4: Frontend (Hours 5-6)
- [ ] Voice UI connected
- [ ] Course selector working
- [ ] Transcript display working
- [ ] Progress dashboard implemented

### Phase 5: Polish (Hours 6+)
- [ ] Interrupt commands working
- [ ] Clarification re-explain working
- [ ] Error handling
- [ ] Testing + bug fixes

## 🔗 External APIs

### SFU Courses API

Base URL: \`https://api.sfucourses.com\`

| Endpoint | Description |
|----------|-------------|
| \`GET /v1/rest/outlines?course_code=X&term=Y\` | Course outline |
| \`GET /v1/rest/sections?course_code=X\` | Course sections |
| \`GET /v1/rest/reviews/courses/{code}\` | Course reviews |
| \`GET /v1/rest/reviews/instructors/{name}\` | Instructor reviews |

## 📝 License

MIT

## 🙏 Acknowledgments

- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Deepgram](https://deepgram.com/) (via Workers AI)
- [SFU Courses API](https://api.sfucourses.com)
- [Shadcn UI](https://ui.shadcn.com/)
