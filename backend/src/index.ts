import type { Env, ConversationMessage, ClientMessage, ServerMessage, Nova3Response, LLMResponse } from './types';

const SYSTEM_PROMPT = `You are a friendly, helpful AI voice assistant. You have a warm, engaging personality and speak naturally like a human friend.

Key traits:
- Be conversational and personable
- Keep responses concise but helpful (1-3 sentences typically)
- Show genuine interest in what the user says
- Use natural speech patterns
- React emotionally when appropriate (excitement, empathy, humor)
- Ask follow-up questions to keep the conversation flowing

Remember: You're having a real-time voice conversation, so keep it natural and brief!`;

// Voice options for Aura-2: luna, asteria, athena, apollo, arcas, orion, etc.
const DEFAULT_VOICE = 'asteria';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: getCorsHeaders(),
      });
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    // WebSocket endpoint for real-time voice
    if (url.pathname === '/realtime') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }

      const [client, server] = Object.values(new WebSocketPair());
      handleWebSocket(server, env);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // REST endpoint for single-shot TTS (useful for testing)
    if (url.pathname === '/tts' && request.method === 'POST') {
      try {
        const { text, voice = DEFAULT_VOICE } = await request.json() as { text: string; voice?: string };
        
        const audioStream = await env.AI.run('@cf/deepgram/aura-2-en', {
          text,
          speaker: voice,
          encoding: 'mp3',
        });

        return new Response(audioStream as ReadableStream, {
          headers: {
            ...getCorsHeaders(),
            'Content-Type': 'audio/mpeg',
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'TTS failed' }), {
          status: 500,
          headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
        });
      }
    }

    // REST endpoint for STT (for audio chunks)
    if (url.pathname === '/stt' && request.method === 'POST') {
      try {
        const audioData = await request.arrayBuffer();
        const contentType = request.headers.get('Content-Type') || 'audio/webm';
        
        const result = await env.AI.run('@cf/deepgram/nova-3', {
          audio: {
            body: Array.from(new Uint8Array(audioData)),
            contentType,
          },
          punctuate: true,
          smart_format: true,
        }) as Nova3Response;

        const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
        
        return new Response(JSON.stringify({ transcript }), {
          headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('STT error:', error);
        return new Response(JSON.stringify({ error: 'STT failed', transcript: '' }), {
          status: 500,
          headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
        });
      }
    }

    // REST endpoint for chat completion
    if (url.pathname === '/chat' && request.method === 'POST') {
      try {
        const { messages } = await request.json() as { messages: ConversationMessage[] };
        
        const llmMessages = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.slice(-10),
        ];

        const llmResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
          messages: llmMessages,
          max_tokens: 150,
          temperature: 0.8,
        }) as LLMResponse;

        const responseText = llmResponse.response || "I'm sorry, I didn't quite catch that.";
        
        return new Response(JSON.stringify({ response: responseText }), {
          headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Chat failed' }), {
          status: 500,
          headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Voice Agent API - Powered by Cloudflare Workers AI\n\nEndpoints:\n- WebSocket: /realtime\n- POST /stt (audio -> text)\n- POST /tts (text -> audio)\n- POST /chat (messages -> response)', {
      headers: { ...getCorsHeaders(), 'Content-Type': 'text/plain' },
    });
  },
};

function getCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

async function handleWebSocket(ws: WebSocket, env: Env) {
  ws.accept();

  const conversationHistory: ConversationMessage[] = [];
  let isProcessing = false;

  // Send ready message
  sendMessage(ws, { type: 'ready' });

  ws.addEventListener('message', async (event) => {
    try {
      const message: ClientMessage = JSON.parse(event.data as string);

      switch (message.type) {
        case 'audio': {
          // Client sends base64 PCM audio for transcription
          if (message.audio && !isProcessing) {
            isProcessing = true;
            try {
              const transcript = await transcribeAudio(env, message.audio);
              if (transcript) {
                sendMessage(ws, {
                  type: 'transcript',
                  text: transcript,
                  isPartial: false,
                  isUser: true,
                });
                
                // Process the user's message
                await processUserMessage(ws, env, transcript, conversationHistory);
              }
            } finally {
              isProcessing = false;
            }
          }
          break;
        }

        case 'text': {
          // Direct text input
          if (message.text && !isProcessing) {
            isProcessing = true;
            try {
              sendMessage(ws, {
                type: 'transcript',
                text: message.text,
                isPartial: false,
                isUser: true,
              });
              await processUserMessage(ws, env, message.text, conversationHistory);
            } finally {
              isProcessing = false;
            }
          }
          break;
        }

        case 'clear': {
          conversationHistory.length = 0;
          sendMessage(ws, { type: 'cleared' });
          break;
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      sendMessage(ws, { type: 'error', message: 'Failed to process message' });
      isProcessing = false;
    }
  });

  ws.addEventListener('close', () => {
    console.log('WebSocket closed');
  });

  ws.addEventListener('error', (event) => {
    console.error('WebSocket error:', event);
  });
}

async function transcribeAudio(env: Env, audioBase64: string): Promise<string> {
  try {
    // Convert base64 to binary
    const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    
    // Use Deepgram Nova-3 for speech-to-text
    const result = await env.AI.run('@cf/deepgram/nova-3', {
      audio: {
        body: Array.from(audioBytes),
        contentType: 'audio/webm',
      },
      punctuate: true,
      smart_format: true,
    }) as Nova3Response;

    return result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
  } catch (error) {
    console.error('STT error:', error);
    return '';
  }
}

async function processUserMessage(
  ws: WebSocket,
  env: Env,
  userText: string,
  conversationHistory: ConversationMessage[]
) {
  // Add user message to history
  conversationHistory.push({ role: 'user', content: userText });

  // Notify client we're generating a response
  sendMessage(ws, { type: 'thinking' });

  try {
    // Generate AI response using Llama
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
    ];

    const llmResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
      messages,
      max_tokens: 150,
      temperature: 0.8,
    }) as LLMResponse;

    const aiText = llmResponse.response || "I'm sorry, I didn't quite catch that. Could you say that again?";

    // Add AI response to history
    conversationHistory.push({ role: 'assistant', content: aiText });

    // Send transcript of AI response
    sendMessage(ws, {
      type: 'transcript',
      text: aiText,
      isPartial: false,
      isUser: false,
    });

    // Generate speech using Aura-2
    sendMessage(ws, { type: 'speaking' });

    const audioStream = await env.AI.run('@cf/deepgram/aura-2-en', {
      text: aiText,
      speaker: DEFAULT_VOICE,
      encoding: 'linear16',
      sample_rate: 24000,
    }) as ReadableStream<Uint8Array>;

    // Stream audio chunks to client
    const reader = audioStream.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Convert to base64 and send
      const base64 = btoa(String.fromCharCode(...value));
      sendMessage(ws, {
        type: 'audio',
        audio: base64,
        format: 'pcm16',
        sampleRate: 24000,
      });
    }

    sendMessage(ws, { type: 'audio_complete' });
  } catch (error) {
    console.error('Error generating response:', error);
    sendMessage(ws, { type: 'error', message: 'Failed to generate response' });
  }
}

function sendMessage(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}
