# MCP Server

This document describes the Model Context Protocol (MCP) server that enables AI-powered tutoring tools for IDE and agent integration.

## Overview

The MCP server is a standalone Node.js application that exposes tutoring capabilities through the Model Context Protocol standard. It can be used with any MCP-compatible client, including Claude Desktop, VS Code extensions, and custom agents.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MCP Client                              │
│            (Claude Desktop, VS Code, Custom Agent)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      MCP Server                              │
│                     (Node.js + TypeScript)                   │
├─────────────────────────────────────────────────────────────┤
│  Tools (16)           │  Resources         │  Prompts        │
│  - Tutoring           │  - Session state   │  - System       │
│  - Courses            │  - Course data     │    prompts      │
│  - Notes              │                    │                 │
│  - Voice              │                    │                 │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌───────────┐   ┌───────────┐   ┌───────────┐
       │  OpenAI   │   │   D1      │   │ Cloudflare│
       │  GPT-4o   │   │ Database  │   │    AI     │
       │  DALL-E 3 │   │           │   │  Search   │
       └───────────┘   └───────────┘   └───────────┘
```

## Installation

### Prerequisites

- Node.js 18+
- Docker (optional, for containerized deployment)
- OpenAI API key

### Local Setup

```bash
cd docker/mcp-server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Build
npm run build

# Run
npm start
```

### Docker Setup

```bash
cd docker/mcp-server

# Build image
docker build -t learnlm-mcp .

# Run container
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=your-key \
  -e CLOUDFLARE_ACCOUNT_ID=your-account \
  -e CLOUDFLARE_API_TOKEN=your-token \
  learnlm-mcp
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4o and DALL-E 3 |
| `CLOUDFLARE_ACCOUNT_ID` | No | Cloudflare account ID for AI Search |
| `CLOUDFLARE_API_TOKEN` | No | Cloudflare API token |
| `DATABASE_PATH` | No | Path to SQLite database (default: `./data/learnlm.db`) |
| `PORT` | No | Server port (default: 3000) |

### Claude Desktop Integration

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "learnlm": {
      "command": "node",
      "args": ["/path/to/docker/mcp-server/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "your-key"
      }
    }
  }
}
```

## Available Tools

### Session Management

#### start_tutoring_session

Start a new tutoring session for a course.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `courseCode` | string | Yes | Course code (e.g., "CMPT 120") |
| `topic` | string | No | Specific topic to focus on |
| `persona` | string | No | Tutor persona (socratic, professor, mentor, standard) |

**Example**
```json
{
  "courseCode": "CMPT 120",
  "topic": "recursion",
  "persona": "socratic"
}
```

#### ask_question

Ask a question in the current tutoring session.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `question` | string | Yes | The question to ask |
| `context` | string | No | Additional context |

#### end_session

End the current tutoring session.

#### get_session_info

Get information about the current session.

### Course Discovery

#### search_courses

Search for courses by code or keyword.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `limit` | number | No | Maximum results (default: 10) |

#### get_course_outline

Get the outline for a specific course.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `courseCode` | string | Yes | Course code |

#### get_instructor_info

Get information about a course instructor.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `courseCode` | string | Yes | Course code |

### Voice and Persona

#### list_voices

List all available TTS voices.

**Response**
```json
{
  "voices": [
    {
      "id": "aura-asteria-en",
      "name": "Asteria",
      "gender": "female",
      "style": "Professional"
    }
  ]
}
```

#### get_voice_for_course

Get the recommended voice for a course based on content.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `courseCode` | string | Yes | Course code |

#### list_personas

List available tutor personas.

**Response**
```json
{
  "personas": [
    {
      "id": "socratic",
      "name": "Socratic Guide",
      "description": "Asks probing questions to guide understanding"
    },
    {
      "id": "professor",
      "name": "Traditional Professor",
      "description": "Lectures with structured explanations"
    },
    {
      "id": "mentor",
      "name": "Patient Mentor",
      "description": "Encouraging and supportive approach"
    },
    {
      "id": "standard",
      "name": "Standard Tutor",
      "description": "Balanced teaching style"
    }
  ]
}
```

### Notes Assistance

#### critique_notes

Analyze notes and provide feedback.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `notes` | string | Yes | The notes content |
| `courseCode` | string | No | Course context |

**Response**
```json
{
  "feedback": {
    "strengths": ["Clear structure", "Good examples"],
    "improvements": ["Add more detail on time complexity"],
    "suggestions": ["Consider adding a diagram"]
  }
}
```

#### explain_concept

Get a detailed explanation of a concept.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `concept` | string | Yes | Concept to explain |
| `context` | string | No | Additional context |
| `depth` | string | No | Explanation depth (basic, intermediate, advanced) |

#### generate_diagram

Generate a diagram description for a concept.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `concept` | string | Yes | Concept to visualize |
| `type` | string | No | Diagram type (flowchart, tree, graph) |

#### get_formulas

Extract and format formulas from notes.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `notes` | string | Yes | Notes containing formulas |

**Response**
```json
{
  "formulas": [
    {
      "name": "Sum of integers",
      "latex": "\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}",
      "explanation": "Sum of first n positive integers"
    }
  ]
}
```

#### chat_message

Send a general chat message.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `message` | string | Yes | Message content |

#### suggest_improvements

Get suggestions for improving notes.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `notes` | string | Yes | Notes content |
| `focus` | string | No | Area to focus on (clarity, completeness, structure) |

## Personas

The MCP server supports multiple tutor personas that change the teaching style:

### Socratic Guide

Engages through questioning rather than direct answers. Helps students discover concepts through guided inquiry.

**System Prompt Characteristics**
- Asks probing questions
- Guides to answers rather than providing them
- Encourages critical thinking

### Traditional Professor

Provides structured, lecture-style explanations with clear definitions and examples.

**System Prompt Characteristics**
- Formal academic tone
- Comprehensive explanations
- References to theory and practice

### Patient Mentor

Encouraging and supportive, breaks down complex topics into digestible pieces.

**System Prompt Characteristics**
- Warm and encouraging
- Step-by-step explanations
- Celebrates progress

### Standard Tutor

Balanced approach combining questioning, explanation, and encouragement.

**System Prompt Characteristics**
- Adaptive to student needs
- Mix of questions and explanations
- Practical focus

## RAG Integration

The MCP server integrates with Cloudflare AI Search for retrieval-augmented generation:

1. **Query Processing**: User questions are analyzed for key concepts
2. **Vector Search**: Relevant course content is retrieved from Vectorize
3. **Context Injection**: Retrieved content is added to the LLM context
4. **Response Generation**: GPT-4o generates responses with grounded information

```typescript
// Example RAG flow
const relevantChunks = await vectorize.query(embedding, { topK: 5 });
const context = relevantChunks.map(c => c.content).join('\n');
const response = await openai.chat.completions.create({
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` }
  ]
});
```

## Development

### Project Structure

```
docker/mcp-server/
├── src/
│   ├── index.ts           # Entry point
│   ├── server.ts          # MCP server setup
│   ├── tools/
│   │   ├── index.ts       # Tool registration
│   │   ├── courses.ts     # Course tools
│   │   ├── instructors.ts # Instructor tools
│   │   ├── personas.ts    # Persona tools
│   │   ├── tutoring.ts    # Tutoring session tools
│   │   ├── voices.ts      # Voice tools
│   │   └── notes.ts       # Notes assistance tools
│   ├── rag/
│   │   └── cloudflare.ts  # Cloudflare AI Search
│   └── db/
│       └── sqlite.ts      # Local SQLite for session state
├── package.json
├── tsconfig.json
└── Dockerfile
```

### Adding New Tools

1. Create a new file in `src/tools/`
2. Define tool schema and handler
3. Register in `src/tools/index.ts`

```typescript
// src/tools/example.ts
import { z } from 'zod';

export const exampleTool = {
  name: 'example_tool',
  description: 'Description of what this tool does',
  parameters: z.object({
    param1: z.string().describe('Parameter description'),
  }),
  handler: async ({ param1 }) => {
    // Implementation
    return { result: 'success' };
  },
};
```

### Testing

```bash
# Run tests
npm test

# Test specific tool
npm run test:tool -- --tool=search_courses
```

## Troubleshooting

### Common Issues

**Connection refused**
- Ensure the server is running
- Check the port configuration
- Verify firewall settings

**OpenAI API errors**
- Verify API key is valid
- Check rate limits
- Ensure sufficient credits

**Database errors**
- Ensure write permissions for database directory
- Check SQLite version compatibility

### Logging

Set `DEBUG=mcp:*` for verbose logging:

```bash
DEBUG=mcp:* npm start
```
