# 🎓 SFU AI Teacher/Tutor

A real-time voice-based AI tutoring platform for SFU students. Pick a course, have a spoken conversation with an AI teacher that uses course data from the SFU Courses API (RAG), with interrupt/clarification commands and progress tracking.

![Voice Agent](https://img.shields.io/badge/AI-Voice%20Tutor-purple)
![React](https://img.shields.io/badge/React-19-blue)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)
![Hono](https://img.shields.io/badge/Hono-v4-green)

## ✨ Features

- **🎙️ Real-Time Voice Conversations**: Speak naturally with your AI tutor using Deepgram Whisper (STT) and Aura (TTS)
- **📚 SFU Course Integration**: RAG-powered responses using real course outlines from SFU Courses API
- **🛑 Interrupt Commands**: Say "Stop", "Wait", or "Hold on" to cancel TTS immediately
- **🔄 Clarification Requests**: Say "What?" or "I don't understand" to get simpler explanations
- **📊 Progress Tracking**: Session history, transcripts, and learning progress saved to D1
- **⚡ Ultra-Low Latency**: Durable Objects with WebSocket hibernation for persistent connections

## 🏗️ Architecture

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
        |                 | - cache course|
        |                 +---------------+

Legend:
  Pages          → Frontend hosting (React/Vite)
  Workers API    → HTTP endpoints + orchestration (Hono)
  Durable Objects→ WebSocket voice session + streaming + state
  D1             → Durable relational storage
  KV             → Low-latency cache + TTL tokens
  Workers AI     → LLM + STT + TTS + embeddings
  Vectorize      → Vector retrieval for RAG
```

## 🛠️ Tech Stack

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
| `@cf/deepgram/aura-*-en` | Text-to-Speech (11 voices) |
| `@cf/meta/llama-3.1-8b-instruct` | Text generation/tutoring |
| `@cf/baai/bge-base-en-v1.5` | 768-dim embeddings |

### Available Voices

| Voice | Style | Best For |
|-------|-------|----------|
| `aura-asteria-en` | Warm, professional (F) | General tutoring |
| `aura-orion-en` | Deep, professional (M) | Technical topics |
| `aura-athena-en` | Confident, clear (F) | Business, leadership |
| `aura-angus-en` | British, refined (M) | Literature, arts |
| `aura-zeus-en` | Powerful, commanding (M) | Motivation |
| + 6 more voices | Various styles | See `/api/voices` |

### Personality Personas

| Persona | Expertise |
|---------|-----------|
| `linus-torvalds` | OS, kernel, open source |
| `guillermo-rauch` | Web dev, React, Vercel |
| `dan-abramov` | React, state management |
| `grace-hopper` | Compilers, programming |
| `richard-feynman` | Physics, problem solving |
| + more | See `/api/personas` |

### Frontend
- React 19 + Vite
- Tailwind CSS v4
- Shadcn UI
- TypeScript

### Backend
- **Hono** on Workers (nodejs_compat)
- TypeScript
- Durable Objects with WebSocket Hibernation

## 📁 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.ts              # Hono entry point + routes
│   │   ├── types.ts              # TypeScript types + Env bindings
│   │   └── durable-objects/
│   │       └── voice-session.ts  # VoiceTeacherSession DO
│   ├── sql/
│   │   └── schema.sql            # D1 database schema
│   ├── wrangler.jsonc            # Cloudflare configuration
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ui/               # Shadcn UI components
    │   │   ├── voice-agent.tsx   # Main voice interface
    │   │   └── transcript-display.tsx
    │   ├── hooks/
    │   │   └── use-realtime-voice.ts
    │   └── lib/
    │       └── utils.ts
    └── package.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account with Workers Paid plan (for Durable Objects)
- Wrangler CLI (`npm install -g wrangler`)

### 1. Clone and Install

```bash
git clone <repo-url>
cd xhacks2026

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies  
cd ../frontend && npm install
```

### 2. Start Development

```bash
# Terminal 1: Backend
cd backend
npm run dev
# Runs at http://localhost:8787

# Terminal 2: Frontend
cd frontend
npm run dev
# Runs at http://localhost:5173
```

### 3. Deploy

```bash
cd backend
npx wrangler deploy
```

**Live Backend**: https://sfu-ai-teacher.email4leit.workers.dev

## 📊 D1 Database Schema

| Table | Purpose |
|-------|---------|
| `users` | User accounts + preferences |
| `sfu_courses` | Cached course metadata |
| `sfu_outlines` | Full course outlines (chunked) |
| `voice_sessions` | Active/completed sessions |
| `transcripts` | Conversation transcripts |
| `progress` | Learning progress per course |

## 🎯 Voice Pipeline Flow

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

## 🔗 External APIs

### SFU Courses API

Base URL: `https://api.sfucourses.com`

| Endpoint | Description |
|----------|-------------|
| `GET /v1/rest/outlines?course_code=X&term=Y` | Course outline |
| `GET /v1/rest/sections?course_code=X` | Course sections |
| `GET /v1/rest/reviews/courses/{code}` | Course reviews |

## 📝 License

MIT
