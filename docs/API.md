# API Reference

This document describes all REST API endpoints exposed by the LearnLM backend.

**Base URL**: `https://sfu-ai-teacher.email4leit.workers.dev`

## Table of Contents

- [Health Check](#health-check)
- [Configuration](#configuration)
- [Courses](#courses)
- [Experts](#experts)
- [Outlines](#outlines)
- [Voice Sessions](#voice-sessions)
- [Editor Chat](#editor-chat)
- [Editor Voice](#editor-voice)
- [MCP Tools](#mcp-tools)
- [Precache](#precache)

---

## Health Check

### GET /health

Check if the API is running.

**Response**
```json
{
  "status": "ok",
  "timestamp": "2026-02-01T12:00:00.000Z"
}
```

---

## Configuration

### GET /api/config

Get application configuration including available voices.

**Response**
```json
{
  "voices": [
    {
      "id": "aura-asteria-en",
      "name": "Asteria",
      "gender": "female",
      "style": "Professional",
      "bestFor": ["lectures", "explanations"]
    }
  ],
  "defaultVoice": "aura-asteria-en"
}
```

---

## Courses

### GET /api/courses

Search courses with optional filters.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Filter by course code or name (e.g., "CMPT", "CMPT 120") |

**Response**
```json
{
  "courses": [
    {
      "id": "94e051fae2395741743e9aac9b88124d",
      "name": "CMPT 120",
      "title": "Introduction to Computing Science and Programming I",
      "description": "An elementary introduction to computing science...",
      "units": "3",
      "prerequisites": "BC Math 12 or equivalent is recommended.",
      "corequisites": "",
      "notes": "Students with credit for CMPT 102...",
      "designation": "Quantitative/Breadth-Science",
      "delivery_method": "In Person",
      "degree_level": "UGRD",
      "term": "Spring 2025",
      "instructors": "Diana Cukierman, John Edgar",
      "created_at": "2026-02-01 14:37:08"
    }
  ]
}
```

### GET /api/courses/:name

Get a specific course by code.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Course code (e.g., "CMPT 120") |

**Response**
```json
{
  "course": { ... }
}
```

### GET /api/courses/id/:id

Get a specific course by ID.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Course UUID |

### GET /api/courses/update/

Sync courses from SFU API.

**Query Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `term` | string | "Fall 2025" | Academic term to filter by |

**Response**
```json
{
  "success": true,
  "message": "Successfully synced courses from SFU API for Spring 2025",
  "coursesAdded": 998
}
```

---

## Experts

### GET /api/experts

Find AI expert tutors for a topic.

**Query Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `topic` | string | required | The topic to find experts for |
| `count` | number | 6 | Number of experts to generate |

**Response**
```json
{
  "experts": [
    {
      "id": "expert-1706...",
      "name": "Ada Lovelace",
      "title": "Pioneer of Computer Programming",
      "era": "19th Century",
      "description": "The first computer programmer...",
      "teachingStyle": "Analytical and methodical...",
      "image": null
    }
  ]
}
```

### GET /api/experts/with-images

Find experts with AI-generated portraits (slower).

**Query Parameters**

Same as `/api/experts`.

**Response**

Same as `/api/experts` but with populated `image` fields (base64 data URLs).

### POST /api/experts/images

Generate portraits for existing experts.

**Request Body**
```json
{
  "experts": [
    {
      "id": "expert-1",
      "name": "Ada Lovelace",
      "title": "Pioneer of Computer Programming",
      "era": "19th Century"
    }
  ]
}
```

**Response**
```json
{
  "success": true,
  "images": [
    {
      "id": "expert-1",
      "image": "data:image/png;base64,..."
    }
  ]
}
```

### POST /api/experts/custom

Generate a custom character from a description.

**Request Body**
```json
{
  "description": "SpongeBob SquarePants"
}
```

**Response**
```json
{
  "success": true,
  "character": {
    "id": "custom-1706...",
    "name": "SpongeBob SquarePants",
    "title": "Fry Cook & Eternal Optimist",
    "era": "Modern",
    "description": "...",
    "teachingStyle": "Enthusiastic and encouraging...",
    "image": "data:image/png;base64,..."
  }
}
```

---

## Outlines

### POST /api/outlines/generate

Generate a course outline (non-streaming).

**Request Body**
```json
{
  "topic": "Introduction to Python",
  "character": {
    "id": "expert-1",
    "name": "Ada Lovelace",
    "teachingStyle": "Analytical approach..."
  },
  "difficulty": "intermediate"
}
```

**Response**
```json
{
  "success": true,
  "outline": {
    "id": "outline-1706...",
    "topic": "Introduction to Python",
    "sections": [...],
    "learningObjectives": [...],
    "estimatedDuration": "2 hours",
    "difficulty": "intermediate",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### GET /api/outlines/generate/stream

Generate a course outline with Server-Sent Events streaming.

**Query Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `topic` | string | required | Topic to generate outline for |
| `character` | string (JSON) | optional | Character info for personalization |
| `difficulty` | string | "intermediate" | beginner, intermediate, advanced |

**Response**: Server-Sent Events stream

```
event: metadata
data: {"learningObjectives":[...],"estimatedDuration":"2 hours","difficulty":"intermediate","totalSections":7}

event: section
data: {"index":0,"section":{...},"total":7}

event: section
data: {"index":1,"section":{...},"total":7}

...

event: complete
data: {"id":"outline-1706...","topic":"...","cached":false}
```

### GET /api/outlines/:id

Get an existing outline by ID.

**Response**
```json
{
  "success": true,
  "outline": { ... }
}
```

### PUT /api/outlines/:id

Update an existing outline.

**Request Body**
```json
{
  "sections": [...],
  "learningObjectives": [...],
  "estimatedDuration": "3 hours",
  "difficulty": "advanced"
}
```

### PATCH /api/outlines/:id/sections/:sectionId

Update a specific section within an outline.

**Request Body**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "duration": "20 min",
  "children": [...]
}
```

### POST /api/outlines/:id/sections/:sectionId/regenerate

Regenerate a section using AI.

**Request Body**
```json
{
  "instructions": "Make it more practical with code examples"
}
```

### DELETE /api/outlines/:id

Delete an outline.

---

## Voice Sessions

### WebSocket /api/voice/:courseCode

Establish a WebSocket connection for voice tutoring.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `courseCode` | string | Course code (e.g., "CMPT120") |

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `topic` | string | Optional topic focus |
| `voice` | string | Voice ID (e.g., "aura-asteria-en") |
| `character` | string (JSON) | Tutor character info |

**WebSocket Messages**

Client to Server:
```json
{
  "type": "audio",
  "data": "<base64 audio>"
}
```

Server to Client:
```json
{
  "type": "transcript",
  "role": "user",
  "content": "What is recursion?"
}
```
```json
{
  "type": "audio",
  "data": "<base64 audio>"
}
```

---

## Editor Chat

### POST /api/editor-chat

Send a chat message with optional slash commands.

**Request Body**
```json
{
  "message": "/explain recursion",
  "sessionId": "session-123",
  "context": {
    "topic": "CMPT 120",
    "notes": "Current editor content...",
    "sectionTitle": "Functions",
    "outlineId": "outline-123"
  }
}
```

**Response**
```json
{
  "response": "Recursion is a programming technique where...",
  "type": "explanation"
}
```

**Supported Slash Commands**
| Command | Description |
|---------|-------------|
| `/ask <question>` | Ask the AI tutor a question |
| `/explain <concept>` | Get a detailed explanation |
| `/formulas` | Extract and format mathematical formulas |
| `/suggest` | Get improvement suggestions for notes |

### POST /api/editor-chat/voice

Send voice audio for transcription and response.

**Request Body**
```json
{
  "audio": "<base64 audio>",
  "sessionId": "session-123",
  "context": { ... }
}
```

**Response**
```json
{
  "transcript": "What is the time complexity?",
  "response": "The time complexity is O(n log n)...",
  "audio": "<base64 audio response>"
}
```

---

## Editor Voice

### WebSocket /api/editor-voice/session/:sessionId

Real-time voice interaction within the editor.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Editor session ID |

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `topic` | string | Current topic |
| `voice` | string | Voice ID |
| `character` | string (JSON) | Tutor character |

---

## MCP Tools

AI-powered tools for the notes editor.

### POST /api/mcp/ask

Ask a question about the current topic.

**Request Body**
```json
{
  "question": "What is Big O notation?",
  "context": {
    "topic": "CMPT 120",
    "notes": "..."
  }
}
```

### POST /api/mcp/explain

Get a detailed explanation of a concept.

**Request Body**
```json
{
  "concept": "recursion",
  "context": { ... }
}
```

### POST /api/mcp/critique

Get a critique of the current notes.

**Request Body**
```json
{
  "notes": "Current notes content...",
  "context": { ... }
}
```

### POST /api/mcp/quick-critique

Lightweight critique for background analysis.

**Request Body**
```json
{
  "notes": "...",
  "topic": "CMPT 120"
}
```

**Response**
```json
{
  "suggestions": [
    {
      "type": "improvement",
      "message": "Consider adding more examples..."
    }
  ]
}
```

### POST /api/mcp/formulas

Extract and format mathematical formulas.

**Request Body**
```json
{
  "notes": "The formula for sum is 1+2+3...+n = n(n+1)/2",
  "context": { ... }
}
```

### POST /api/mcp/suggest

Get improvement suggestions.

**Request Body**
```json
{
  "notes": "...",
  "context": { ... }
}
```

---

## Precache

Background pre-caching for improved performance.

### POST /api/precache/outline

Pre-cache an outline for a topic.

**Request Body**
```json
{
  "topic": "CMPT 120: Introduction to Computing Science"
}
```

### POST /api/precache/experts

Pre-cache experts for a topic.

**Request Body**
```json
{
  "topic": "CMPT 120: Introduction to Computing Science"
}
```

### GET /api/precache/status/:topic

Check cache status for a topic.

**Response**
```json
{
  "outline": true,
  "experts": true,
  "cachedAt": "2026-02-01T12:00:00.000Z"
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**HTTP Status Codes**
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (missing or invalid parameters) |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Internal Server Error |

## Rate Limiting

API requests are rate limited. When rate limited, you'll receive:

**Response** (429)
```json
{
  "success": false,
  "error": "Rate limit exceeded"
}
```

**Headers**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706803200
```
