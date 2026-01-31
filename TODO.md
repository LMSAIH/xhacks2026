# 📋 SFU AI Teacher - Task Board

## Infrastructure Status ✅
- [x] D1 database created (`sfu-ai-teacher-db`)
- [x] KV namespace created
- [x] Vectorize index created (768 dims, cosine)
- [x] Schema applied to D1
- [x] Worker deployed: https://sfu-ai-teacher.email4leit.workers.dev

---

## 👤 Frontend Dev (Person 1)

### Priority: Voice UI & WebSocket Connection
- [ ] **Connect WebSocket to backend** - Update `use-realtime-voice.ts` to connect to `/api/voice/:courseCode`
- [ ] **Course selector component** - Dropdown/search to pick SFU courses before starting session
- [ ] **Audio playback** - Handle incoming TTS audio chunks from WebSocket
- [ ] **Microphone capture** - Send audio chunks to WebSocket (16kHz PCM or Opus)
- [ ] **Interrupt button** - Visual "Stop" button that sends interrupt command
- [ ] **Loading states** - Show when AI is thinking/speaking
- [ ] **Mobile responsive** - Make sure voice UI works on mobile

### Nice to Have
- [ ] Voice visualizer during playback
- [ ] Dark mode toggle
- [ ] Session history sidebar

---

## 🔧 Fullstack Dev 1 (Person 2)

### Priority: SFU API Integration + RAG
- [ ] **SFU API client** - Create service to fetch from `api.sfucourses.com`
  - `GET /v1/rest/outlines?course_code=CMPT120&term=1251`
  - `GET /v1/rest/sections?course_code=CMPT120`
  - `GET /v1/rest/reviews/courses/CMPT120`
- [ ] **Courses endpoint** - Implement `GET /api/courses` to list available courses
- [ ] **Course detail endpoint** - Implement `GET /api/courses/:code` with outline data
- [ ] **Ingestion pipeline** - Implement `POST /api/admin/ingest`
  - Fetch courses from SFU API
  - Store in D1 `sfu_courses` and `sfu_outlines` tables
  - Generate embeddings with `@cf/baai/bge-base-en-v1.5`
  - Upsert to Vectorize index
- [ ] **RAG retrieval** - Query Vectorize for relevant course content in voice session

### Nice to Have
- [ ] Cache SFU API responses in KV
- [ ] Instructor reviews integration
- [ ] Course search with fuzzy matching

---

## 🔧 Fullstack Dev 2 (Person 3)

### Priority: Voice Pipeline Integration
- [ ] **STT integration** - Add `@cf/deepgram/nova-3` to voice session
  - Receive audio chunks from WebSocket
  - Stream to STT, get transcript
- [ ] **TTS integration** - Add `@cf/deepgram/aura-1` to voice session
  - Convert LLM response to audio
  - Stream audio chunks back to client
- [ ] **Interrupt detection** - Parse transcript for "stop", "wait", "hold on"
  - Cancel TTS playback when detected
- [ ] **Progress tracking** - Implement `GET /api/progress/:userId`
  - Query D1 for user's session history
  - Calculate stats per course

### Nice to Have
- [ ] Turn detection with `@cf/pipecat-ai/smart-turn-v2`
- [ ] Re-explain command ("what?", "I don't understand")
- [ ] Session summary at end

---

## ⚙️ Backend Dev (Person 4)

### Priority: Durable Object & Data Layer
- [ ] **Enhance VoiceTeacherSession DO**
  - Add session state management (idle, listening, thinking, speaking)
  - Handle multiple concurrent connections gracefully
  - Implement session timeout/cleanup
- [ ] **D1 queries** - Create typed query helpers
  - `insertSession(userId, courseCode)`
  - `insertTranscript(sessionId, role, text)`
  - `updateProgress(userId, courseCode, metrics)`
  - `getSessionHistory(userId)`
- [ ] **LLM context management**
  - Build system prompt with RAG context
  - Maintain conversation history in DO state
  - Token limit handling (truncate old messages)
- [ ] **WebSocket protocol** - Define message types
  - `{ type: 'audio', data: ArrayBuffer }`
  - `{ type: 'transcript', text: string, role: 'user'|'assistant' }`
  - `{ type: 'status', state: 'listening'|'thinking'|'speaking' }`
  - `{ type: 'error', message: string }`

### Nice to Have
- [ ] Rate limiting with KV
- [ ] Analytics/metrics collection
- [ ] Graceful error recovery in WebSocket

---

## 🎯 Integration Checkpoints

### Checkpoint 1: Basic Flow
- [ ] Frontend can connect WebSocket to backend
- [ ] Backend receives audio, sends mock response
- [ ] Frontend plays mock audio

### Checkpoint 2: AI Pipeline
- [ ] STT transcribes user speech
- [ ] LLM generates response
- [ ] TTS converts to audio

### Checkpoint 3: RAG + Courses
- [ ] Course data ingested to D1 + Vectorize
- [ ] LLM uses course context in responses

### Checkpoint 4: Polish
- [ ] Interrupt commands work
- [ ] Progress saved to D1
- [ ] Error handling complete

---

## 📞 Quick Reference

**Backend URL (prod)**: https://sfu-ai-teacher.email4leit.workers.dev  
**WebSocket endpoint**: `wss://sfu-ai-teacher.email4leit.workers.dev/api/voice/CMPT120`  
**Health check**: `GET /health`

**Cloudflare Dashboard**:
- D1: `sfu-ai-teacher-db`
- Vectorize: `sfu-course-index`
