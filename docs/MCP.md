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
│  Tools (20)           │  Resources         │  Prompts        │
│  - Tutoring (4)       │  - Session state   │  - System       │
│  - Courses (4)        │  - Course data     │    prompts      │
│  - Documents (4)      │                    │                 │
│  - Notes (5)          │                    │                 │
│  - Voice/Persona (3)  │                    │                 │
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

## Adding LearnLM to Your AI Tools

LearnLM provides an MCP server that integrates with AI coding assistants like VS Code Copilot, Cursor, Claude Desktop, and OpenCode. Once configured, you can ask your AI assistant to search courses, get tutoring help, critique your notes, and more.

### Option 1: Remote Server (Recommended)

The easiest way to use LearnLM is via our hosted MCP server at `https://mcp.learn-lm.com`. No local setup required!

#### VS Code (GitHub Copilot) - Remote

```json
{
  "mcp": {
    "servers": {
      "learnlm": {
        "type": "http",
        "url": "https://mcp.learn-lm.com/mcp"
      }
    }
  }
}
```

#### Cursor - Remote

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "learnlm": {
      "type": "http",
      "url": "https://mcp.learn-lm.com/mcp"
    }
  }
}
```

#### Claude Desktop - Remote

```json
{
  "mcpServers": {
    "learnlm": {
      "type": "http",
      "url": "https://mcp.learn-lm.com/mcp"
    }
  }
}
```

#### OpenCode - Remote

Add to `opencode.json`:

```json
{
  "mcp": {
    "learnlm": {
      "type": "remote",
      "url": "https://mcp.learn-lm.com/mcp"
    }
  }
}
```

---

### Option 2: Local Server (Self-Hosted)

If you prefer to run the MCP server locally, follow these steps:

#### Prerequisites

1. **Build the MCP server** (one-time setup):
   ```bash
   cd docker/mcp-server
   npm install
   npm run build
   ```

2. **Get an OpenAI API key** from [platform.openai.com](https://platform.openai.com)

3. **Note the full path** to the built server:
   ```bash
   # Get the absolute path (you'll need this for configuration)
   echo "$(pwd)/dist/index.js"
   # Example: /home/user/learnlm/docker/mcp-server/dist/index.js
   ```

---

#### VS Code (GitHub Copilot) - Local

#### VS Code (GitHub Copilot) - Local

1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "mcp" 
3. Click "Edit in settings.json"
4. Add the LearnLM server configuration:

```json
{
  "mcp": {
    "servers": {
      "learnlm": {
        "command": "node",
        "args": ["/full/path/to/docker/mcp-server/dist/index.js"],
        "env": {
          "OPENAI_API_KEY": "sk-your-openai-key"
        }
      }
    }
  }
}
```

5. Restart VS Code
6. Open Copilot Chat and try: `@learnlm search for CMPT 225`

---

#### Cursor - Local

#### Cursor - Local

1. Open Cursor Settings (`Ctrl+,` or `Cmd+,`)
2. Go to **Features** > **MCP Servers**
3. Click **Add Server** and enter:

| Field | Value |
|-------|-------|
| Name | `learnlm` |
| Command | `node` |
| Arguments | `/full/path/to/docker/mcp-server/dist/index.js` |

4. Add environment variable: `OPENAI_API_KEY` = `sk-your-key`
5. Restart Cursor

Or edit `~/.cursor/mcp.json` directly:

```json
{
  "mcpServers": {
    "learnlm": {
      "command": "node",
      "args": ["/full/path/to/docker/mcp-server/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-your-openai-key"
      }
    }
  }
}
```

---

#### Claude Desktop - Local

#### Claude Desktop - Local

1. Open the Claude Desktop config file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Add the LearnLM server:

```json
{
  "mcpServers": {
    "learnlm": {
      "command": "node",
      "args": ["/full/path/to/docker/mcp-server/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-your-openai-key"
      }
    }
  }
}
```

3. Restart Claude Desktop
4. You should see "learnlm" in the MCP tools list (hammer icon)

---

#### OpenCode - Local

#### OpenCode - Local

Add to your project's `opencode.json`:

```json
{
  "mcp": {
    "learnlm": {
      "type": "local",
      "command": ["node", "/full/path/to/docker/mcp-server/dist/index.js"],
      "environment": {
        "OPENAI_API_KEY": "sk-your-openai-key"
      }
    }
  }
}
```

Or add globally to `~/.opencode/config.json`.

---

#### Windsurf - Local

#### Windsurf - Local

1. Open Windsurf Settings
2. Navigate to **AI** > **MCP Servers**
3. Add a new server with:

```json
{
  "learnlm": {
    "command": "node",
    "args": ["/full/path/to/docker/mcp-server/dist/index.js"],
    "env": {
      "OPENAI_API_KEY": "sk-your-openai-key"
    }
  }
}
```

---

## Local Server Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4o and DALL-E 3 |
| `LEARNLM_BACKEND_URL` | No | LearnLM backend API (default: `https://sfu-ai-teacher.email4leit.workers.dev`) |
| `CLOUDFLARE_ACCOUNT_ID` | No | Cloudflare account ID for AI Search |
| `CLOUDFLARE_API_TOKEN` | No | Cloudflare API token |

---

## Verifying the Installation

After configuring, test that the MCP server is working:

1. **In VS Code/Cursor**: Open the AI chat and type:
   ```
   Use the learnlm tools to search for CMPT 225
   ```

2. **In Claude Desktop**: Look for the hammer icon showing available tools. Click it to see the 20 LearnLM tools.

3. **Common issues**:
   - "Command not found": Check the path to `dist/index.js` is correct
   - "Module not found": Run `npm install && npm run build` in the mcp-server directory
   - No tools appearing: Restart the application after adding the config

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

### Course Discovery (Enhanced)

#### search_courses

Search for SFU courses with rich filtering. Supports text search, course code normalization, prerequisite lookup, instructor search, and level filtering.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | No | General text search (title, description) |
| `courseCode` | string | No | Course code lookup with auto-normalization. "CMPT225", "cmpt-225", "CMPT 225" all work |
| `department` | string | No | Filter by department code (e.g., "CMPT", "MATH") |
| `level` | string | No | Filter by level: "100", "200", "300", "400", "500" (graduate) |
| `instructor` | string | No | Search by instructor name |
| `prerequisites` | string | No | Find courses that require this course as a prerequisite |
| `limit` | number | No | Maximum results (default: 10, max: 50) |

**Examples**
```json
// Find 300-level CMPT courses
{ "department": "CMPT", "level": "300" }

// Find courses requiring CMPT 225
{ "prerequisites": "CMPT225" }

// Search by instructor
{ "instructor": "John Edgar" }

// Text search with department filter
{ "query": "machine learning", "department": "CMPT" }
```

**Response**
```json
{
  "courses": [
    {
      "code": "CMPT 225",
      "title": "Data Structures and Programming",
      "description": "Introduction to data structures...",
      "units": "3",
      "prerequisites": "CMPT 125 or CMPT 129 or CMPT 135.",
      "corequisites": "MACM 201.",
      "instructors": "John Edgar, Victor Cheung",
      "level": "UGRD",
      "relevance": 1.0
    }
  ],
  "total": 1,
  "source": "backend_api",
  "searchType": "advanced"
}
```

#### get_course_outline

Get detailed course information including outline, prerequisites, and instructor. Course code is normalized automatically.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `courseCode` | string | Yes | Course code (e.g., "CMPT 225", "CMPT225", "cmpt-225" all work) |

**Response**
```json
{
  "found": true,
  "code": "CMPT 225",
  "title": "Data Structures and Programming",
  "description": "Introduction to data structures...",
  "units": "3",
  "prerequisites": "CMPT 125 or CMPT 129 or CMPT 135.",
  "corequisites": "MACM 201.",
  "instructors": "John Edgar, Victor Cheung",
  "level": "UGRD",
  "deliveryMethod": "In Person",
  "term": "Spring 2025",
  "outline": "Course content from knowledge base...",
  "source": "backend_api"
}
```

#### find_prerequisites

Find all courses that require a specific course as a prerequisite. E.g., "What courses require CMPT 225?"

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `courseCode` | string | Yes | The prerequisite course code to search for |
| `limit` | number | No | Maximum results (default: 15) |

**Example**
```json
{ "courseCode": "CMPT 225" }
```

**Response**
```json
{
  "prerequisite": "CMPT 225",
  "coursesRequiring": [
    {
      "code": "CMPT 295",
      "title": "Introduction to Computer Systems",
      "prerequisites": "CMPT 225 with a minimum grade of C-.",
      "instructors": "Brian Fraser"
    },
    {
      "code": "CMPT 307",
      "title": "Data Structures and Algorithms",
      "prerequisites": "CMPT 225; MACM 201.",
      "instructors": "Binay Bhattacharya"
    }
  ],
  "total": 15,
  "message": "Found 15 courses that require CMPT 225"
}
```

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
| `depth` | string | No | Explanation depth (brief, standard, detailed) |

#### generate_diagram

Generate an educational diagram. Behavior depends on `source` parameter:
- **CLI/agent mode** (default): Returns a detailed text description of the diagram
- **WebApp mode**: Generates an actual image using DALL-E 3

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `description` | string | Yes | Description of the diagram to generate |
| `style` | string | No | Visual style: diagram, illustration, flowchart, infographic, sketch |
| `courseCode` | string | No | Course code for context |
| `source` | string | No | "cli" (default) for text description, "webapp" for image generation |

**Response (CLI mode)**
```json
{
  "success": true,
  "mode": "description",
  "source": "cli",
  "diagramDescription": "## Overview\nA flowchart showing the recursive call stack...\n\n## Components\n1. Base case box...",
  "note": "Image generation is only available in webapp mode."
}
```

**Response (WebApp mode)**
```json
{
  "success": true,
  "mode": "image",
  "source": "webapp",
  "image": "data:image/png;base64,...",
  "revisedPrompt": "Educational flowchart showing..."
}
```

#### get_formulas

Extract and format formulas for a topic.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `topic` | string | Yes | Topic to get formulas for |
| `courseCode` | string | No | Course-specific formulas |
| `format` | string | No | Output format: latex, plain, both |

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

### Document Tools (IDE/Agent Integrations)

These tools are designed for use with IDE integrations like GitHub Copilot Chat, VS Code extensions, and other MCP-compatible agents. When users reference files like `@notes.md`, the agent reads the file content and passes it to these tools.

#### critique_document

Critique and review a document (notes, essay, code documentation).

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `content` | string | Yes | The document content (agent reads the file and passes content) |
| `filename` | string | No | Original filename for context (e.g., "notes.md") |
| `courseCode` | string | No | Course code for academic context |
| `focusAreas` | array | No | Areas to focus: clarity, completeness, accuracy, structure, grammar, citations |
| `documentType` | string | No | Type: notes, essay, code, documentation, report, other |

**Example Usage in Copilot Chat**
```
Use LearnLM to critique my notes in @chapter1-notes.md for CMPT 225
```

**Response**
```json
{
  "success": true,
  "critique": "## Strengths\n1. Clear organization...\n\n## Areas for Improvement\n...\n\n## Overall Assessment: 7/10",
  "filename": "chapter1-notes.md",
  "courseCode": "CMPT 225",
  "documentType": "notes"
}
```

#### suggest_document

Suggest specific improvements for a document. Returns actionable suggestions that can be applied directly.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `content` | string | Yes | The document content |
| `filename` | string | No | Original filename |
| `courseCode` | string | No | Course code for RAG lookup |
| `improvementType` | string | No | Type: expand, clarify, restructure, add_examples, fix_errors, all |
| `section` | string | No | Specific section to focus on |

**Example Usage**
```
Suggest improvements for @recursion-notes.md focusing on adding examples
```

**Response**
```json
{
  "success": true,
  "suggestions": "## Suggested Additions\n...\n\n## Suggested Changes\n...\n\n## Missing Topics\n...",
  "improvementType": "add_examples",
  "hasContext": true
}
```

#### ask_document

Ask a question about a document. The AI answers based on the document content and optionally course knowledge.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `content` | string | Yes | The document content |
| `question` | string | Yes | Question about the document |
| `filename` | string | No | Original filename |
| `courseCode` | string | No | Course code for additional context |
| `answerStyle` | string | No | Style: concise, detailed, socratic |

**Example Usage**
```
Based on @lecture-notes.md, explain the difference between stacks and queues
```

**Response**
```json
{
  "success": true,
  "answer": "Based on your notes, stacks and queues differ in...",
  "question": "explain the difference between stacks and queues",
  "answerStyle": "detailed"
}
```

#### summarize_document

Summarize a document into key points. Useful for creating study guides or quick references.

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `content` | string | Yes | The document content |
| `filename` | string | No | Original filename |
| `summaryType` | string | No | Format: bullet_points, paragraph, outline, flashcards |
| `maxLength` | string | No | Length: short (~100 words), medium (~300), long (~500) |
| `focusTopic` | string | No | Specific topic to focus on |

**Example Usage**
```
Summarize @chapter5.md as flashcards
```

**Response**
```json
{
  "success": true,
  "summary": "**Q:** What is Big O notation?\n**A:** A mathematical notation that describes...\n\n**Q:** What is the time complexity of binary search?\n**A:** O(log n)...",
  "summaryType": "flashcards",
  "maxLength": "medium"
}
```

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
│   ├── index.ts           # Entry point (stdio transport)
│   ├── http-server.ts     # HTTP transport entry point
│   ├── tools/
│   │   ├── index.ts       # Tool registration (20 tools)
│   │   ├── courses.ts     # Course search with rich filtering
│   │   ├── documents.ts   # Document tools for IDE integrations
│   │   ├── instructors.ts # Instructor lookup
│   │   ├── notes.ts       # Notes assistance tools
│   │   ├── personas.ts    # Tutor persona definitions
│   │   ├── tutoring.ts    # Session management
│   │   └── voices.ts      # Voice selection
│   ├── llm/
│   │   └── openai.ts      # GPT-4o and DALL-E client
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
