# Features

This document describes the key features of LearnLM and what makes the project stand out.

## Core Features

### 1. AI Tutor Characters

Learn from AI tutors inspired by historical figures or create custom characters.

**Historical Figures**
- Ada Lovelace (analytical, methodical approach)
- Albert Einstein (intuitive, thought experiment style)
- Richard Feynman (playful, first-principles thinking)
- Marie Curie (rigorous, experimental focus)
- Socrates (questioning, Socratic method)
- Carl Sagan (wonder-inspiring, accessible explanations)

**Custom Characters**
- Enter any description (real, fictional, or imaginary)
- AI generates personality, teaching style, and portrait
- Examples: SpongeBob, Gordon Ramsay, a wise wizard, your grandmother

**Implementation Highlights**
- AI-generated expert profiles based on topic relevance
- Unique teaching styles influence response generation
- Dynamic portrait generation with FLUX.1 Schnell
- Character context maintained throughout session

### 2. Real-Time Voice Tutoring

Natural voice conversations with AI tutors using WebSocket connections.

**Capabilities**
- Speak naturally and receive spoken responses
- Low-latency audio streaming
- Interrupt the tutor mid-response (spacebar)
- Multiple voice options (11 Deepgram Aura voices)
- Conversation context maintained across turns

**Technical Implementation**
- WebSocket connections via Cloudflare Durable Objects
- Speech-to-text: Whisper Large v3 Turbo
- Text-to-speech: Deepgram Aura
- Stateful sessions with conversation history
- RAG integration for course-specific knowledge

### 3. Streaming Course Outlines

AI-generated course outlines with real-time progressive rendering.

**Features**
- Server-Sent Events (SSE) for streaming generation
- Sections appear as they're generated
- Editable outline (click any section to modify)
- Personalized to selected tutor's teaching style
- Cached for instant retrieval on repeat visits

**Outline Structure**
- 5-7 main sections
- 2-4 subsections per section
- Learning objectives
- Estimated duration per section
- Difficulty level indication

### 4. Notes Editor with AI Assistance

Rich text editor with integrated AI tools for learning support.

**Editor Features**
- BlockNote-based rich text editing
- Markdown support
- Code blocks with syntax highlighting
- Mathematical formula rendering

**AI Assistance**
- Slash commands for quick actions
- Background critique (debounced, non-intrusive)
- Context-aware suggestions based on current section
- Integration with course outline

**Slash Commands**
| Command | Action |
|---------|--------|
| `/ask <question>` | Ask the tutor a question |
| `/explain <concept>` | Get detailed explanation |
| `/formulas` | Extract and format formulas |
| `/suggest` | Get improvement suggestions |

### 5. Background Notes Critique

Continuous, non-intrusive feedback on notes as you write.

**How It Works**
1. User types in the editor
2. After 2 seconds of inactivity, critique is triggered
3. AI analyzes notes in the background
4. Suggestions appear in sidebar without interrupting flow

**Feedback Types**
- Missing concepts
- Unclear explanations
- Suggested additions
- Structure improvements

### 6. SFU Course Integration

Direct integration with Simon Fraser University course catalog.

**Features**
- 998 courses from Spring 2025 term
- Search by course code or title
- Full course details (description, prerequisites, instructors)
- Term and instructor information
- Automatic sync from SFU API

**Course Data**
- Course code and title
- Description
- Prerequisites and corequisites
- Units and designation
- Delivery method
- Current term instructors

### 7. Onboarding Pipeline

Optimized onboarding with parallel data fetching.

**Pipeline Steps**
1. **Select Topic** - Choose SFU course or custom topic
2. **Choose Tutor** - AI-generated experts or custom character
3. **Select Voice** - 11 voice options with preview
4. **Review Outline** - Streaming generation with edit capability

**Parallel Processing**
- Expert generation starts immediately
- Outline generation runs in parallel
- Image generation runs in background
- By step 3, outline is usually ready

### 8. Multiple Tutor Personas

Different teaching approaches for different learning styles.

| Persona | Approach |
|---------|----------|
| Socratic | Questions to guide discovery |
| Professor | Structured lectures with theory |
| Mentor | Encouraging, step-by-step |
| Standard | Balanced, adaptive style |

### 9. Voice Selection

11 distinct voices for personalized learning experience.

**Female Voices**
- Asteria (Professional)
- Luna (Warm)
- Stella (Clear)
- Athena (Authoritative)
- Hera (Friendly)

**Male Voices**
- Orion (Deep)
- Arcas (Energetic)
- Perseus (Calm)
- Angus (Warm)
- Orpheus (Expressive)
- Helios (Confident)

### 10. RAG-Powered Context

Retrieval-Augmented Generation for accurate, course-specific responses.

**How It Works**
1. Course content is chunked and embedded
2. User questions trigger semantic search
3. Relevant chunks are retrieved from Vectorize
4. Context is injected into LLM prompt
5. Responses are grounded in actual course material

---

## Technical Differentiators

### Fully Serverless Architecture

- No traditional servers to manage
- Cloudflare Workers for compute
- Durable Objects for stateful sessions
- D1 for relational data
- KV for caching
- Vectorize for semantic search

### Edge-First Design

- All inference runs on Cloudflare's edge network
- Low latency globally
- No cold starts with Workers
- Automatic scaling

### Cost-Efficient AI

- Workers AI included in $5/month plan
- No per-inference costs
- Efficient model selection (Llama 3.1 8B)
- Smart caching reduces redundant inference

### Progressive Enhancement

- Streaming responses for immediate feedback
- Background processing for non-critical tasks
- Graceful degradation when services unavailable
- Pre-caching for popular content

### MCP Integration

- Standard protocol for IDE/agent integration
- Enables AI coding assistants to use tutoring tools
- Extensible tool system
- Separate from main application (optional)

---

## Feature Roadmap

### Planned Features

**Learning Progress Tracking**
- Track topics covered per course
- Mastery score calculation
- Learning analytics dashboard
- Spaced repetition suggestions

**Collaborative Learning**
- Share notes with peers
- Group tutoring sessions
- Discussion threads per topic

**Content Export**
- Export notes as PDF
- Export as Markdown
- Anki flashcard generation
- Study guide compilation

**Mobile Support**
- Progressive Web App
- Offline note access
- Voice tutoring on mobile

**Advanced RAG**
- User-uploaded materials
- Lecture slide integration
- Textbook content indexing
- Cross-course knowledge linking

---

## What Makes LearnLM Stand Out

1. **Personalized AI Tutors** - Not just an AI chatbot, but a character with personality and teaching style

2. **Voice-First Interaction** - Natural spoken conversation, not just text chat

3. **Course-Aware Context** - RAG integration means responses are grounded in actual course material

4. **Real-Time Streaming** - Progressive rendering for immediate feedback, no waiting for complete responses

5. **Integrated Learning Environment** - Notes, tutoring, and course content in one place

6. **Edge Performance** - Global low latency with Cloudflare's edge network

7. **Open Architecture** - MCP integration enables extensibility and IDE integration

8. **SFU Integration** - Direct course catalog integration with real academic content

9. **No Account Required** - Start learning immediately, no sign-up friction

10. **Cost-Efficient** - Runs entirely on Cloudflare's affordable infrastructure
