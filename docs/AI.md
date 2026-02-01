# AI Models

This document describes all AI models used in LearnLM, their purposes, and configuration.

## Overview

LearnLM uses Cloudflare Workers AI for all inference in the main application, with optional OpenAI integration in the MCP server for higher-quality responses.

## Model Summary

| Category | Model | Provider | Use Case |
|----------|-------|----------|----------|
| LLM | Llama 3.1 8B Instruct | Cloudflare Workers AI | Text generation, tutoring, analysis |
| STT | Whisper Large v3 Turbo | Cloudflare (Deepgram) | Speech-to-text transcription |
| TTS | Deepgram Aura | Cloudflare Workers AI | Text-to-speech synthesis |
| Embeddings | BGE Base EN v1.5 | Cloudflare Workers AI | Semantic search, RAG |
| Image | FLUX.1 Schnell | Cloudflare Workers AI | Expert portrait generation |
| LLM (MCP) | GPT-4o | OpenAI | High-quality tutoring (MCP only) |
| Image (MCP) | DALL-E 3 | OpenAI | Image generation (MCP only) |

---

## Large Language Models

### Llama 3.1 8B Instruct

**Model ID**: `@cf/meta/llama-3.1-8b-instruct`

**Variant**: `@cf/meta/llama-3.1-8b-instruct-fast` (lower latency)

The primary LLM for all text generation tasks in the Cloudflare Worker.

**Use Cases**
- Course outline generation
- Expert tutor profile creation
- Chat responses
- Notes critique and suggestions
- Concept explanations
- Question answering

**Configuration**
```typescript
const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ],
  max_tokens: 4096,
  temperature: 0.7,
});
```

**Performance Characteristics**
- Latency: 500ms - 2s (depends on output length)
- Context window: 128K tokens
- Optimized for instruction following
- Good balance of speed and quality

**When to Use Fast Variant**
- Real-time chat responses
- Voice session responses (latency-sensitive)
- Background processing where speed matters

### GPT-4o (MCP Server Only)

**Model ID**: `gpt-4o`

**Provider**: OpenAI

Used in the standalone MCP server for higher-quality responses.

**Use Cases**
- Complex tutoring sessions
- Detailed concept explanations
- High-stakes academic assistance

**Configuration**
```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  temperature: 0.7,
});
```

---

## Speech-to-Text

### Whisper Large v3 Turbo

**Model ID**: `@cf/deepgram/whisper-large-v3-turbo`

**Fallback**: `@cf/openai/whisper`

Transcribes user speech to text in voice tutoring sessions.

**Use Cases**
- Voice tutoring input
- Editor voice commands
- Audio note transcription

**Configuration**
```typescript
const transcription = await env.AI.run('@cf/deepgram/whisper-large-v3-turbo', {
  audio: audioBuffer,
});
```

**Performance Characteristics**
- Latency: 200-500ms for typical utterances
- Supports multiple languages
- High accuracy for academic vocabulary
- Handles accents well

**Audio Requirements**
- Format: WAV, MP3, or raw PCM
- Sample rate: 16kHz recommended
- Channels: Mono preferred

---

## Text-to-Speech

### Deepgram Aura

**Model ID**: `@cf/deepgram/aura-1`

Synthesizes natural-sounding speech from AI responses.

**Available Voices**

| Voice ID | Name | Gender | Style | Best For |
|----------|------|--------|-------|----------|
| `aura-asteria-en` | Asteria | Female | Professional | Lectures, formal explanations |
| `aura-luna-en` | Luna | Female | Warm | Mentoring, encouragement |
| `aura-stella-en` | Stella | Female | Clear | Technical content |
| `aura-athena-en` | Athena | Female | Authoritative | Academic topics |
| `aura-hera-en` | Hera | Female | Friendly | Casual learning |
| `aura-orion-en` | Orion | Male | Deep | Historical figures |
| `aura-arcas-en` | Arcas | Male | Energetic | Engaging explanations |
| `aura-perseus-en` | Perseus | Male | Calm | Complex topics |
| `aura-angus-en` | Angus | Male | Warm | Supportive tutoring |
| `aura-orpheus-en` | Orpheus | Male | Expressive | Storytelling |
| `aura-helios-en` | Helios | Male | Confident | Leadership topics |

**Configuration**
```typescript
const audio = await env.AI.run('@cf/deepgram/aura-1', {
  text: responseText,
  voice: 'aura-asteria-en',
});
```

**Performance Characteristics**
- Latency: 100-300ms
- Output format: PCM audio
- Natural prosody and intonation
- Supports SSML for fine control

---

## Embeddings

### BGE Base EN v1.5

**Model ID**: `@cf/baai/bge-base-en-v1.5`

Generates vector embeddings for semantic search and RAG.

**Use Cases**
- Course content indexing
- Semantic search queries
- Similar content retrieval
- Context retrieval for RAG

**Configuration**
```typescript
const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
  text: contentToEmbed,
});
// Returns: { data: number[] } with 768 dimensions
```

**Vector Specifications**
- Dimensions: 768
- Similarity metric: Cosine
- Optimized for English text

**Vectorize Integration**
```typescript
// Insert
await env.VECTORIZE.insert([{
  id: 'chunk-123',
  values: embedding.data,
  metadata: { courseCode: 'CMPT 120', type: 'syllabus' }
}]);

// Query
const results = await env.VECTORIZE.query(queryEmbedding.data, {
  topK: 5,
  filter: { courseCode: 'CMPT 120' }
});
```

---

## Image Generation

### FLUX.1 Schnell

**Model ID**: `@cf/black-forest-labs/flux-1-schnell`

Generates AI portraits for expert tutors.

**Use Cases**
- Expert tutor portraits
- Custom character images
- Historical figure representations

**Configuration**
```typescript
const image = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', {
  prompt: 'Professional portrait of Ada Lovelace, 19th century mathematician, elegant Victorian attire, studio lighting',
  num_steps: 4,
});
// Returns: { image: Uint8Array }
```

**Performance Characteristics**
- Latency: 2-5 seconds
- Output: PNG image
- Resolution: 1024x1024
- Fast inference with good quality

**Prompt Guidelines**
- Include role/profession
- Specify time period for historical figures
- Add lighting and style descriptors
- Keep prompts concise but descriptive

### DALL-E 3 (MCP Server Only)

**Model ID**: `dall-e-3`

**Provider**: OpenAI

Higher quality image generation in the MCP server.

**Configuration**
```typescript
const response = await openai.images.generate({
  model: 'dall-e-3',
  prompt: imagePrompt,
  size: '1024x1024',
  quality: 'standard',
});
```

---

## Model Selection Guidelines

### When to Use Which Model

| Scenario | Recommended Model | Reason |
|----------|-------------------|--------|
| Real-time chat | Llama 3.1 8B Fast | Low latency |
| Outline generation | Llama 3.1 8B | Good structure |
| Voice response | Llama 3.1 8B Fast + Aura | Latency critical |
| Complex explanation | GPT-4o (MCP) | Higher quality |
| Content search | BGE Base | Semantic matching |
| Expert portraits | FLUX Schnell | Fast generation |

### Cost Considerations

Cloudflare Workers AI is included with the Workers paid plan:
- No per-request costs for AI inference
- Included in $5/month Workers Paid plan
- Higher limits with Enterprise plan

OpenAI costs (MCP server only):
- GPT-4o: ~$5 per 1M input tokens, ~$15 per 1M output tokens
- DALL-E 3: ~$0.04 per image

### Latency Optimization

1. **Use streaming** for long responses
2. **Prefer fast variants** for interactive use
3. **Pre-cache** outlines and expert profiles
4. **Batch requests** when possible
5. **Use KV caching** for repeated queries

---

## Error Handling

All AI calls should handle potential failures:

```typescript
try {
  const response = await env.AI.run(modelId, params);
  if (!response?.response) {
    throw new Error('Empty response from AI');
  }
  return response;
} catch (error) {
  console.error('AI inference failed:', error);
  // Fall back to cached content or default response
  return fallbackResponse;
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Rate limited | Too many requests | Implement backoff |
| Timeout | Long generation | Use streaming |
| Invalid input | Malformed request | Validate before calling |
| Model unavailable | Temporary outage | Use fallback model |
