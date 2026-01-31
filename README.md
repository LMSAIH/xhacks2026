# 🎙️ Real-Time Voice Agent

A super-fast, real-time voice AI agent with instant responses. Built with React, Shadcn UI, Tailwind CSS, and Cloudflare Workers.

![Voice Agent](https://img.shields.io/badge/AI-Voice%20Agent-purple)
![React](https://img.shields.io/badge/React-19-blue)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)

## ✨ Features

- **Ultra-Low Latency**: Real-time voice-to-voice communication using OpenAI's Realtime API
- **Natural Conversations**: Server-side Voice Activity Detection (VAD) for seamless turn-taking
- **Beautiful UI**: Modern, animated interface with voice visualizer
- **Live Transcripts**: See what you and the AI are saying in real-time
- **WebSocket Communication**: Persistent connection for instant responses

## 🏗️ Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐    WebSocket    ┌─────────────────┐
│                 │ ◄─────────────► │                 │ ◄─────────────► │                 │
│  React Frontend │                 │ Cloudflare      │                 │  OpenAI         │
│  (Vite + Shadcn)│                 │ Worker          │                 │  Realtime API   │
│                 │                 │                 │                 │                 │
└─────────────────┘                 └─────────────────┘                 └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- OpenAI API key with Realtime API access
- Cloudflare account (for deployment)

### 1. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Set your OpenAI API key
# Option 1: Edit wrangler.toml and set OPENAI_API_KEY
# Option 2: Use wrangler secret (recommended for production)
npx wrangler secret put OPENAI_API_KEY

# Start development server
npm run dev
```

The backend will start at `http://localhost:8787`

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start at `http://localhost:5173`

### 3. Start Talking!

1. Open `http://localhost:5173` in your browser
2. Click the call button to connect
3. Start speaking - the AI will respond instantly!

## 📁 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.ts      # Cloudflare Worker entry point
│   │   └── types.ts      # TypeScript types
│   ├── wrangler.toml     # Cloudflare configuration
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ui/               # Shadcn UI components
    │   │   ├── voice-agent.tsx   # Main voice agent component
    │   │   ├── voice-visualizer.tsx
    │   │   ├── transcript-display.tsx
    │   │   ├── control-buttons.tsx
    │   │   └── status-indicator.tsx
    │   ├── hooks/
    │   │   └── use-realtime-voice.ts  # WebSocket & audio handling
    │   └── lib/
    │       └── utils.ts
    └── package.json
```

## 🔧 Configuration

### Environment Variables

**Frontend** (`.env`):
```env
VITE_BACKEND_URL=ws://localhost:8787/realtime
```

**Backend** (`wrangler.toml`):
```toml
[vars]
OPENAI_API_KEY = "your-api-key"
```

### Voice Settings

You can customize the AI's voice and behavior in `backend/src/index.ts`:

```typescript
const SYSTEM_INSTRUCTIONS = `Your custom instructions here...`;

const sessionConfig = {
  voice: 'shimmer',  // Options: alloy, echo, fable, onyx, nova, shimmer
  temperature: 0.8,
  // ...
};
```

## 🚢 Deployment

### Deploy Backend to Cloudflare

```bash
cd backend
npx wrangler deploy
```

### Deploy Frontend

Update `VITE_BACKEND_URL` to your deployed worker URL, then:

```bash
cd frontend
npm run build
# Deploy dist/ to your hosting provider (Vercel, Netlify, Cloudflare Pages, etc.)
```

## 🎨 Tech Stack

- **Frontend**
  - React 19
  - Vite
  - Tailwind CSS v4
  - Shadcn UI
  - Lucide Icons
  - TypeScript

- **Backend**
  - Cloudflare Workers
  - WebSockets
  - TypeScript

- **AI**
  - OpenAI Realtime API (gpt-4o-realtime-preview)
  - Whisper (for transcription)

## 📝 License

MIT

## 🙏 Acknowledgments

- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [Shadcn UI](https://ui.shadcn.com/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
