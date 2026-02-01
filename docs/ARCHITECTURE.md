# Architecture

This document describes the system architecture, data storage, and data flow for LearnLM.

## Overview

LearnLM is built on Cloudflare's developer platform, leveraging Workers for compute, D1 for relational data, KV for caching, Vectorize for semantic search, and Workers AI for inference.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  Frontend                                   │
│                         React + Vite + TailwindCSS                          │
│                              (Cloudflare Pages)                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Cloudflare Worker                              │
│                              (Hono Framework)                               │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────┤
│   REST API  │  WebSocket  │   SSE       │  Cron Jobs  │   Rate Limiting     │
│  Endpoints  │   (Voice)   │ (Streaming) │ (Precache)  │                     │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│       D1        │       │       KV        │       │    Vectorize    │
│    (SQLite)     │       │    (Cache)      │       │  (Embeddings)   │
│                 │       │                 │       │                 │
│ - Users         │       │ - Experts cache │       │ - Course chunks │
│ - Courses       │       │ - Outlines      │       │ - Semantic      │
│ - Sessions      │       │ - Course data   │       │   search        │
│ - Transcripts   │       │                 │       │                 │
│ - Progress      │       │ TTL: 24 hours   │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Durable Objects                                │
│                                                                             │
│  ┌─────────────────────────┐       ┌─────────────────────────┐              │
│  │   VoiceTeacherSession   │       │   EditorVoiceSession    │              │
│  │                         │       │                         │              │
│  │ - WebSocket handling    │       │ - Editor voice chat     │              │
│  │ - Conversation state    │       │ - Section context       │              │
│  │ - Audio streaming       │       │ - Notes integration     │              │
│  └─────────────────────────┘       └─────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Workers AI                                    │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │     LLM      │  │     STT      │  │     TTS      │  │   Embedding  │     │
│  │  Llama 3.1   │  │   Whisper    │  │  Deepgram    │  │   BGE Base   │     │
│  │    8B        │  │   Large v3   │  │    Aura      │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                                             │
│  ┌──────────────┐                                                           │
│  │    Image     │                                                           │
│  │    FLUX      │                                                           │
│  │   Schnell    │                                                           │
│  └──────────────┘                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Storage

### D1 Database (SQLite)

Primary relational database for persistent data.

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts and preferences | id, email, name, preferences (JSON) |
| `sfu_courses` | Cached SFU course catalog | name, title, description, prerequisites, instructors |
| `sfu_outlines` | Chunked course content for RAG | course_id, chunk_index, content_type, content, embedding_id |
| `voice_sessions` | Voice tutoring session metadata | user_id, course_id, status, topic, duration_seconds |
| `transcripts` | Conversation transcripts | session_id, sequence, role, content, confidence |
| `progress` | Learning progress per course | user_id, course_id, topics_covered, mastery_score |
| `instructors` | Instructor data with ratings | sfu_id, name, rating, difficulty |
| `course_sessions` | User session configuration | course_code, voice_config, personality_config |
| `outlines_edited` | User-modified outlines | session_id, course_code, outline_json |
| `course_outlines` | AI-generated course outlines | topic, character_json, outline_json |

### KV Namespace

Key-value store for caching with automatic TTL expiration.

| Key Pattern | Data | TTL |
|-------------|------|-----|
| `experts:{topic}` | Generated expert profiles | 24 hours |
| `outline:{topic}` | Pre-cached course outlines | 24 hours |
| `course:{code}` | Course metadata | 24 hours |
| `course:instructor:{code}` | Course with instructor data | 24 hours |
| `courses:all` | Full course catalog | 24 hours |

### Vectorize Index

Semantic search index for RAG (Retrieval-Augmented Generation).

- **Index Name**: `sfu-course-content`
- **Embedding Model**: `@cf/baai/bge-base-en-v1.5`
- **Dimensions**: 768
- **Metric**: Cosine similarity

Stores embeddings for:
- Course descriptions
- Syllabus content
- Learning objectives
- Lecture notes

## Data Flow

### Course Selection Flow

```
User selects course
        │
        ▼
Frontend calls /api/courses?name=CMPT
        │
        ▼
Worker queries D1 for matching courses
        │
        ▼
Returns course list with titles, descriptions
        │
        ▼
User clicks course → navigates to /customize
        │
        ▼
Pipeline starts (parallel):
  ├─→ /api/experts?topic=... (find AI tutors)
  ├─→ /api/outlines/generate/stream (generate outline via SSE)
  └─→ /api/experts/images (generate portraits - background)
```

### Voice Session Flow

```
User clicks "Start Learning"
        │
        ▼
Frontend opens WebSocket to /api/voice/:courseCode
        │
        ▼
Worker creates/retrieves Durable Object (VoiceTeacherSession)
        │
        ▼
DO maintains conversation state
        │
        ▼
User speaks → Audio captured in browser
        │
        ▼
Audio sent via WebSocket
        │
        ▼
DO processes:
  1. STT (Whisper) → Text
  2. RAG query (Vectorize) → Context
  3. LLM (Llama) → Response
  4. TTS (Deepgram) → Audio
        │
        ▼
Audio streamed back to browser
```

### Notes Editor Flow

```
User types in editor
        │
        ▼
Debounced (2s) background critique triggered
        │
        ▼
/api/mcp/quick-critique called with notes content
        │
        ▼
LLM analyzes notes, returns suggestions
        │
        ▼
Suggestions displayed in sidebar
        │
        ▼
User can also use slash commands:
  /ask "question" → AI answers
  /explain "concept" → Detailed explanation
  /formulas → Extract and format formulas
  /suggest → Get improvement suggestions
```

## External Integrations

### SFU Courses API

- **Endpoint**: `https://api.sfucourses.com/v1/rest/outlines`
- **Purpose**: Fetch course catalog for current term
- **Sync**: Manual via `/api/courses/update/` endpoint
- **Data**: Course codes, titles, descriptions, prerequisites, instructors

### MCP Server (Optional)

A separate Node.js server providing Model Context Protocol tools for IDE integration.

- **Runtime**: Docker container or local Node.js
- **AI Provider**: OpenAI GPT-4o (for higher quality responses)
- **Image Generation**: DALL-E 3
- **Purpose**: IDE/agent integration for tutoring workflows

## Deployment Architecture

### Production

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Cloudflare Pages | learn-lm.com |
| Backend | Cloudflare Workers | sfu-ai-teacher.email4leit.workers.dev |
| Database | Cloudflare D1 | sfu-ai-teacher-db |
| Cache | Cloudflare KV | SFU_AI_TEACHER_KV |
| Vectors | Cloudflare Vectorize | sfu-course-content |

### Environment Bindings

```jsonc
{
  "d1_databases": [{ "binding": "DB", "database_name": "sfu-ai-teacher-db" }],
  "kv_namespaces": [{ "binding": "KV" }],
  "vectorize": [{ "binding": "VECTORIZE", "index_name": "sfu-course-content" }],
  "ai": { "binding": "AI" },
  "durable_objects": {
    "bindings": [
      { "name": "VOICE_SESSION", "class_name": "VoiceTeacherSession" },
      { "name": "EDITOR_VOICE", "class_name": "EditorVoiceSession" }
    ]
  }
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

| Limiter | Limit | Window |
|---------|-------|--------|
| `api_general` | 100 requests | 1 minute |
| `ai_generation` | 20 requests | 1 minute |
| `voice_session` | 10 connections | 1 minute |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
