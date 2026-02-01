# Voice Optimization Multi-Agent Prompt

## Objective
Reduce end-to-end voice latency in the SFU AI Teacher from ~3-4s to <1.5s by optimizing the STT→LLM→TTS pipeline.

## Context Files
- `backend/src/durable-objects/voice-session.ts` - Main voice DO handler
- `frontend/src/hooks/use-realtime-voice.ts` - Frontend audio capture/playback
- `frontend/src/components/voice-agent.tsx` - Voice UI component
- `backend/src/types.ts` - Shared message types (MUST modify first)

## Available AI Models
- STT: `@cf/deepgram/whisper-large-v3-turbo`
- TTS: `@cf/deepgram/aura-asteria-en`
- LLM: `@cf/meta/llama-3.1-8b-instruct`

---

## 🚨 EXECUTION ORDER (Critical)

**PHASE 0 (Do First - All Agents Wait)**
1. **Create `types_v2.ts`** - Define ALL new message types in a new file
2. All agents import from `types_v2.ts` to avoid conflicts

**PHASE 1 (Can Run in Parallel)**
- Agent 1: Backend Streaming STT
- Agent 2: Backend Streaming TTS

**PHASE 2 (After Phase 1)**
- Agent 4: Parallel LLM + TTS (depends on Agent 2)

**FRONTEND PHASE (Independent)**
- Agent 3: Frontend Audio Pipeline
- Agent 5: Interrupt & VAD Enhancement (depends on Agent 3)

---

## PHASE 0: Shared Types (Do This First!)

Create `backend/src/types_v2.ts`:

```typescript
export interface ClientMessage {
  type: 'start_session' | 'clear_history' | 'interrupt' | 'audio' | 'text';
  courseCode?: string;
  audio?: string;  // base64 for v1, ArrayBuffer for v2
  text?: string;
  sequence?: number;  // v2: for audio ordering
}

export interface ServerMessageV2 {
  type: 'ready' | 'session_started' | 'cleared' | 'interrupted' | 'error';
  | 'transcript_partial' | 'transcript' | 'audio_chunk' | 'audio_complete'
  | 'state_change' | 'interrupt_detected';
  
  sessionId?: string;
  message?: string;
  text?: string;
  isUser?: boolean;
  isPartial?: boolean;
  audio?: string;
  chunkIndex?: number;
  totalChunks?: number;
  state?: 'listening' | 'processing' | 'speaking' | 'idle';
}
```

---

## Agent 1: Backend Streaming STT Optimization

**Goal**: Implement streaming STT with partial results for faster transcription feedback

**Prerequisites**: ✅ Phase 0 complete

**Tasks**:
1. Modify `handleAudio()` to send partial transcripts as they arrive
2. Send `{ type: 'transcript_partial', text: string }` immediately when Whisper returns partial results
3. Send final `{ type: 'transcript', text: string, isUser: true }` when complete

**Files to modify**:
- `backend/src/durable-objects/voice-session.ts` - Add partial transcript logic

**Success criteria**:
- First partial transcript appears within 300ms of audio start
- Partial results update in real-time as Whisper processes

---

## Agent 2: Backend Streaming TTS with Chunked Audio

**Goal**: Stream TTS audio chunks as they are generated instead of waiting for full response

**Prerequisites**: ✅ Phase 0 complete

**Tasks**:
1. Modify `handleAudio()` and `handleText()` to process TTS in chunks
2. Send `{ type: 'audio_chunk', audio: base64, chunkIndex: number, totalChunks: number }`
3. Send `{ type: 'audio_complete' }` when all chunks sent
4. **IMPORTANT**: Keep Agent 1's partial transcript logic working alongside this

**Files to modify**:
- `backend/src/durable-objects/voice-session.ts` - Chunked TTS streaming

**Success criteria**:
- First audio chunk arrives within 200ms of LLM response start
- Audio plays continuously without gaps
- Total perceived latency reduced by 30-50%

---

## Agent 3: Frontend Audio Pipeline Optimization

**Goal**: Reduce frontend capture/playback latency

**Prerequisites**: None (can start immediately)

**Tasks**:
1. Reduce MediaRecorder chunk interval from 100ms to 40ms
2. Implement audio pre-buffering - start AudioContext before receiving data
3. Change WebSocket binary encoding from base64 to ArrayBuffer for 33% bandwidth reduction
4. Add connection warmup on page load (establish WS connection early)
5. Handle new `audio_chunk` and `audio_complete` messages

**Files to modify**:
- `frontend/src/hooks/use-realtime-voice.ts` - All optimizations

**Success criteria**:
- Audio capture latency reduced from 100ms to 40ms
- WebSocket message size reduced by 33%
- Connection ready before user clicks "Start"

---

## Agent 4: Parallel LLM + TTS Pipeline

**Goal**: Start TTS generation while LLM is still streaming output

**Prerequisites**: ✅ Agent 2 complete (chunked TTS must work first)

**Tasks**:
1. Modify LLM call to use streaming if available, or optimize sequential calls
2. Process LLM response tokens as they arrive (if streaming)
3. Begin TTS generation on first complete sentence
4. Queue subsequent sentences for TTS as LLM generates
5. Ensure chunked audio streaming integrates with parallel TTS

**Files to modify**:
- `backend/src/durable-objects/voice-session.ts`

**Success criteria**:
- TTS starts before LLM finishes generating
- Perceived response time reduced by 200-400ms

---

## Agent 5: Interrupt & VAD Enhancement

**Goal**: Add Voice Activity Detection for natural conversation flow

**Prerequisites**: ✅ Agent 3 complete (optimized audio capture needed)

**Tasks**:
1. Implement VAD in frontend using Web Audio API analysis
2. Auto-detect when user starts/stops speaking
3. Update frontend hook to support auto-listening mode
4. Handle false positives (coughs, background noise)
5. Send `{ type: 'interrupt' }` when VAD detects user speech during AI response

**Files to modify**:
- `frontend/src/hooks/use-realtime-voice.ts` - VAD implementation

**Success criteria**:
- Hands-free mode works reliably
- Interrupt commands ("stop", "wait") detected within 200ms

---

## Conflict Resolution Protocol

### If Two Agents Modify Same File:
1. Agent with lower number has priority for shared sections
2. Document all changes in a `CHANGES_LOG.md` file
3. Use `// === AGENT X ===` comments to demarcate sections

### Message Type Conflicts:
- All message types defined in `types_v2.ts` (Phase 0)
- No agent modifies types after Phase 0
- Frontend uses types_v2.ts for parsing

### Integration Testing:
After each phase, run:
```bash
cd backend && npm run dev &
cd frontend && npm run dev &
# Test WebSocket connection, audio capture, and playback
```

---

## Message Protocol (v2)

```typescript
// Client → Server
{ type: 'audio', audio: ArrayBuffer | string, sequence?: number }
{ type: 'text', text: string }
{ type: 'interrupt' }
{ type: 'audio_stream_start' }
{ type: 'audio_stream_end' }

// Server → Client (v2)
{ type: 'transcript_partial', text: string }
{ type: 'transcript', text: string, isUser: boolean }
{ type: 'audio_chunk', audio: string, chunkIndex: number, totalChunks: number }
{ type: 'audio_complete' }
{ type: 'state_change', state: 'listening'|'processing'|'speaking'|'idle' }
{ type: 'interrupt_detected' }
```

---

## Testing Commands

```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev

# Measure latency
# 1. Start recording
# 2. Speak "What is a variable?"
# 3. Measure: recording_end → first_audio_chunk
# Target: < 1.5s total
```

---

## Coordination Checklist

- [ ] Phase 0: `types_v2.ts` created and shared
- [ ] Agent 1: Partial transcripts working
- [ ] Agent 2: Chunked TTS streaming working
- [ ] Agent 3: Frontend optimizations applied
- [ ] Agent 4: Parallel LLM+TTS integrated
- [ ] Agent 5: VAD hands-free mode working
- [ ] Integration: All agents' changes work together
- [ ] Latency: End-to-end < 1.5s achieved
