# Features

LearnLM brings historical figures back to life as AI tutors. This document describes the platform's key features.

## Core Features

### 1. Historical AI Tutors

Learn from AI tutors inspired by history's greatest minds.

**Available Tutors**
- **Albert Einstein** - Intuitive explanations, thought experiments
- **Ada Lovelace** - Analytical, methodical programming instruction
- **Richard Feynman** - Playful, first-principles thinking
- **Marie Curie** - Rigorous experimental focus
- **Socrates** - Questioning, Socratic method
- **Carl Sagan** - Wonder-inspiring, accessible science

**Custom Characters**
- Enter any description (real, fictional, or imaginary)
- AI generates personality, teaching style, and portrait
- Examples: SpongeBob, Gordon Ramsay, a wise wizard

**How It Works**
- AI generates expert profiles based on topic relevance
- Each tutor has a unique teaching style that influences responses
- Portraits generated dynamically with FLUX.1 Schnell
- Character context maintained throughout the session

### 2. Real-Time Voice Tutoring

Natural voice conversations with AI tutors using WebSocket connections.

**Capabilities**
- Speak naturally and receive spoken responses
- Low-latency audio streaming
- Interrupt the tutor mid-response (spacebar)
- 11 voice options (Deepgram Aura voices)
- Conversation context maintained across turns

**Technical Stack**
- WebSocket via Cloudflare Durable Objects
- Speech-to-text: Whisper Large v3 Turbo
- Text-to-speech: Deepgram Aura
- ElevenLabs Conversational AI integration
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
- Mathematical formula rendering (LaTeX)

**Slash Commands**
| Command | Action |
|---------|--------|
| `/ask` | Ask the tutor a question |
| `/explain` | Get detailed explanation of a concept |
| `/formulas` | Extract and format formulas for current section |
| `/suggest` | Get improvement suggestions for your notes |
| `/critique` | Get AI critique of your notes |

**AI Blocks**
- Responses appear inline as dismissible blocks
- Formula blocks with LaTeX rendering
- "Add to notes" action to incorporate AI suggestions
- Dismiss (X) button to remove any AI block

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

Direct integration with Simon Fraser University's course catalog.

**Features**
- 998 courses from current term
- Search by course code or title
- Full course details (description, prerequisites, instructors)
- Term and instructor information
- RAG-powered responses grounded in course materials

**Course Data**
- Course code and title
- Description and prerequisites
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

### 8. Tutor Personas

Different teaching approaches for different learning styles.

| Persona | Approach |
|---------|----------|
| Socratic | Questions to guide discovery |
| Professor | Structured lectures with theory |
| Mentor | Encouraging, step-by-step guidance |
| Standard | Balanced, adaptive style |

### 9. Voice Selection

11 distinct voices for personalized learning.

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
3. Relevant chunks retrieved from Vectorize
4. Context injected into LLM prompt
5. Responses grounded in actual course material

---

## Technical Highlights

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
- No per-inference costs for most operations
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
- 20 tools available
- Separate from main application (optional)

---

## What Makes LearnLM Stand Out

1. **Historical AI Tutors** - Learn from Einstein, Curie, Feynman, and more
2. **Voice-First Interaction** - Natural spoken conversation, not just text
3. **Course-Aware Context** - RAG ensures responses are grounded in course material
4. **Real-Time Streaming** - Progressive rendering, no waiting for complete responses
5. **Integrated Learning Environment** - Notes, tutoring, and course content in one place
6. **Edge Performance** - Global low latency with Cloudflare's edge network
7. **Open Architecture** - MCP integration for IDE extensibility
8. **SFU Integration** - Real academic content from 998 courses
9. **No Account Required** - Start learning immediately
10. **Hackathon Quality** - Built for SystemHacks:XHacks 2026 by Team The Smurfs
