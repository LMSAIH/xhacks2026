# LearnLM MCP Server

Model Context Protocol (MCP) server for the SFU AI Tutor - LearnLM. Provides intelligent tutoring tools powered by GPT-4o and Cloudflare AI Search.

## Features

- **10 MCP Tools** for AI tutoring workflows
- **Dual Transport Support**: stdio (Claude Desktop) + HTTP (production deployments)
- **RAG Integration**: Cloudflare AI Search for course content
- **Multiple Personas**: Socratic, Professor, Mentor, and Standard Tutor modes
- **Voice Selection**: 11 TTS voice options with smart course-based recommendations

## Quick Start

### Local Development (Claude Desktop)

```bash
cd docker/mcp-server
npm install
npm run build

# Add to Claude Desktop config (~/.config/claude/claude_desktop_config.json):
{
  "mcpServers": {
    "learnlm": {
      "command": "node",
      "args": ["/path/to/docker/mcp-server/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key",
        "CF_API_TOKEN": "your-cf-token",
        "CF_ACCOUNT_ID": "your-account-id"
      }
    }
  }
}
```

### HTTP Server (Production)

```bash
npm run start:http
# Server runs on http://localhost:3000

# Endpoints:
# GET  /         - Server info
# GET  /health   - Health check
# POST /mcp      - MCP protocol (Streamable HTTP)
```

### Docker Deployment

```bash
# From project root
docker compose up -d

# With custom domain (for HTTPS)
DOMAIN=mcp.yourdomain.com docker compose up -d
```

## Available Tools

| Tool | Description |
|------|-------------|
| `start_tutoring_session` | Start a new tutoring session for a course |
| `ask_question` | Ask a question within an active session |
| `end_session` | End a tutoring session |
| `get_session_info` | Get information about an active session |
| `search_courses` | Search SFU courses by keyword or code |
| `get_course_outline` | Get detailed course outline from RAG |
| `get_instructor_info` | Get instructor information and ratings |
| `list_voices` | List available TTS voices |
| `get_voice_for_course` | Get recommended voice for a course |
| `list_personas` | List available tutor personas |

## Tool Details

### Tutoring Session Tools

#### `start_tutoring_session`
```json
{
  "courseCode": "CMPT 120",      // Required
  "persona": "socratic",          // Optional: socratic, professor, mentor, tutor
  "voiceId": "neo",               // Optional: auto-selected if not provided
  "metadata": {}                  // Optional: custom session data
}
```

#### `ask_question`
```json
{
  "sessionId": "uuid-here",       // Required: from start_tutoring_session
  "question": "What is recursion?"// Required
}
```

#### `end_session`
```json
{
  "sessionId": "uuid-here"        // Required
}
```

### Course & Search Tools

#### `search_courses`
```json
{
  "query": "machine learning",    // Required
  "limit": 10                     // Optional: default 10
}
```

#### `get_course_outline`
```json
{
  "courseCode": "CMPT 120"        // Required
}
```

#### `get_instructor_info`
```json
{
  "name": "John Smith",           // Required
  "courseCode": "CMPT 120"        // Optional
}
```

### Voice & Persona Tools

#### `list_voices`
No parameters required. Returns 11 voices with characteristics.

#### `get_voice_for_course`
```json
{
  "courseCode": "CMPT 120"        // Required
}
```

Voice recommendations by department:
- **CS/CMPT**: Neo (Modern, calm - tech/coding)
- **BUS/BUSN**: Athena (Confident, clear - business)
- **PHIL/ENGL/ART**: Angus (British, refined - humanities)
- **PHYS/CHEM/BIO**: Orion (Deep, professional - sciences)
- **Other**: Asteria (Warm, professional - general)

#### `list_personas`
No parameters required. Returns 4 tutor personas.

## Personas

| ID | Name | Style |
|----|------|-------|
| `socratic` | Socratic Tutor | Guided questioning for self-discovery |
| `professor` | Professor | Formal academic with detailed explanations |
| `mentor` | Friendly Mentor | Casual, encouraging with real-world examples |
| `tutor` | Standard Tutor | Balanced explanation and practice |

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4o |
| `CF_API_TOKEN` | Yes | Cloudflare API token |
| `CF_ACCOUNT_ID` | Yes | Cloudflare account ID |
| `CF_AI_SEARCH_NAME` | No | AI Search instance name (default: learnlm-rag) |
| `CF_R2_BUCKET` | No | R2 bucket name (default: learnlm-courses) |
| `PORT` | No | HTTP server port (default: 3000) |
| `HOST` | No | HTTP server host (default: 0.0.0.0) |

## Testing

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
```

## Architecture

```
src/
├── index.ts           # stdio entry (Claude Desktop)
├── http-server.ts     # HTTP entry (production)
├── tools/
│   ├── index.ts       # Tool registration
│   ├── tutoring.ts    # Session management + GPT-4o
│   ├── courses.ts     # Course search + RAG
│   ├── instructors.ts # Instructor lookup
│   ├── voices.ts      # TTS voice selection
│   └── personas.ts    # Tutor persona definitions
├── rag/
│   └── cloudflare.ts  # AI Search client
├── llm/
│   └── openai.ts      # GPT-4o client
└── db/
    └── sqlite.ts      # Local session/cache storage
```

## Deployment

### Homelab (Primary)
```bash
./scripts/deploy-homelab.sh --build
```

### Render.com (Fallback)
Push to GitHub and connect to Render. Configuration in `render.yaml`.

## License

MIT
