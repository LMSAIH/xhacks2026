import { Hono } from 'hono';
import type { Env } from '../types';
import { 
  type DeepgramVoice, 
  VOICES,
  getSpeakerName,
} from '../voices';
import {
  askQuestion,
  explainConcept,
  critiqueNotesWithDiff,
  getFormulas,
  suggestNotes,
} from '../services/ai-tools';

const editorChatRoutes = new Hono<{ Bindings: Env }>();

// In-memory session store (in production, use KV or D1)
interface ChatSession {
  history: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  config: {
    voice: DeepgramVoice;
    professorName: string;
    professorPersonality: string;
    topic: string;
    sectionTitle: string;
  };
  notesContent?: string; // Current notes content for commands
}

const sessions = new Map<string, ChatSession>();

// Slash command patterns - detect "slash" spoken aloud
// Handles variations like "slash", "flash" (common mishearing), with/without arguments
const SLASH_COMMAND_PATTERNS = [
  // "slash critique my notes" / "slash critique notes" / "slash critique" / "flash critique"
  { pattern: /^(?:slash|flash)\s+critiqu?e?(\s+my)?(\s+notes)?/i, command: 'critique' },
  // "slash explain <topic>" - argument optional, can be empty
  { pattern: /^(?:slash|flash)\s+explain(?:\s+(.*))?/i, command: 'explain', extractArg: true },
  // "slash ask <question>" - argument optional
  { pattern: /^(?:slash|flash)\s+ask(?:\s+(.*))?/i, command: 'ask', extractArg: true },
  // "slash formulas <topic>" / "slash get formulas <topic>" - argument optional
  { pattern: /^(?:slash|flash)\s+(?:get\s+)?formulas?(?:\s+(.*))?/i, command: 'formulas', extractArg: true },
  // "slash suggest" / "slash suggest notes"
  { pattern: /^(?:slash|flash)\s+suggest(?:\s+notes)?/i, command: 'suggest' },
];

interface SlashCommand {
  command: 'critique' | 'explain' | 'ask' | 'formulas' | 'suggest';
  argument?: string;
}

function parseSlashCommand(text: string): SlashCommand | null {
  const normalized = text.trim();
  
  for (const { pattern, command, extractArg } of SLASH_COMMAND_PATTERNS) {
    const match = normalized.match(pattern);
    if (match) {
      const result: SlashCommand = { command: command as SlashCommand['command'] };
      if (extractArg && match[1]) {
        result.argument = match[1].trim();
      }
      console.log(`Parsed slash command: ${command}, arg: ${result.argument || '(none)'}`);
      return result;
    }
  }
  
  return null;
}

// Execute a slash command and return the result
async function executeSlashCommand(
  env: Env,
  cmd: SlashCommand,
  notesContent?: string
): Promise<{ 
  response: string; 
  commandType: string;
  data?: unknown;
  spokenResponse: string; // Shorter version for TTS
}> {
  switch (cmd.command) {
    case 'critique': {
      if (!notesContent || notesContent.trim().length < 10) {
        return {
          response: 'I need some notes to critique. Please add more content to your notes first.',
          commandType: 'critique',
          spokenResponse: "I need some notes to critique. Please add more content first.",
        };
      }
      
      const result = await critiqueNotesWithDiff(env, notesContent);
      const suggestionCount = result.suggestions?.length || 0;
      
      return {
        response: result.overallFeedback || 'Notes reviewed.',
        commandType: 'critique',
        data: result,
        spokenResponse: suggestionCount > 0 
          ? `I found ${suggestionCount} suggestion${suggestionCount === 1 ? '' : 's'} for your notes. ${result.overallFeedback || ''}`
          : `Your notes look great! ${result.overallFeedback || ''}`,
      };
    }
    
    case 'explain': {
      if (!cmd.argument) {
        return {
          response: 'What would you like me to explain?',
          commandType: 'explain',
          spokenResponse: 'What would you like me to explain?',
        };
      }
      
      const explanation = await explainConcept(env, cmd.argument);
      return {
        response: explanation,
        commandType: 'explain',
        data: { concept: cmd.argument, explanation },
        spokenResponse: explanation.slice(0, 500), // Truncate for TTS
      };
    }
    
    case 'ask': {
      if (!cmd.argument) {
        return {
          response: 'What would you like to ask?',
          commandType: 'ask',
          spokenResponse: 'What would you like to ask?',
        };
      }
      
      const answer = await askQuestion(env, cmd.argument);
      return {
        response: answer,
        commandType: 'ask',
        data: { question: cmd.argument, answer },
        spokenResponse: answer.slice(0, 500), // Truncate for TTS
      };
    }
    
    case 'formulas': {
      if (!cmd.argument) {
        return {
          response: 'What topic do you need formulas for?',
          commandType: 'formulas',
          spokenResponse: 'What topic do you need formulas for?',
        };
      }
      
      const formulas = await getFormulas(env, cmd.argument);
      return {
        response: formulas,
        commandType: 'formulas',
        data: { topic: cmd.argument, formulas },
        spokenResponse: `Here are the key formulas for ${cmd.argument}. I've added them to your notes.`,
      };
    }
    
    case 'suggest': {
      const suggestions = await suggestNotes(env, notesContent || '');
      return {
        response: suggestions,
        commandType: 'suggest',
        data: { suggestions },
        spokenResponse: 'I\'ve generated some suggested notes based on your current content. Check them out in the editor.',
      };
    }
    
    default:
      return {
        response: 'Unknown command.',
        commandType: 'unknown',
        spokenResponse: 'Sorry, I didn\'t recognize that command.',
      };
  }
}

function buildSystemPrompt(config: ChatSession['config']): string {
  const { professorName, professorPersonality, topic, sectionTitle } = config;

  let prompt = `You are ${professorName}, an AI tutor who is ${professorPersonality}.\n\n`;
  prompt += `You are helping a student learn about "${topic}".\n`;
  prompt += `Currently, you are teaching the section: "${sectionTitle}".\n\n`;
  prompt += `Guidelines:\n`;
  prompt += `- Keep responses concise (2-4 sentences) for spoken dialogue\n`;
  prompt += `- Be conversational and natural\n`;
  prompt += `- Relate answers to the current section when relevant\n`;
  prompt += `- Use natural speech patterns\n`;
  prompt += `- Avoid code blocks or formatting that doesn't work in speech\n`;

  return prompt;
}

// Create or get session
editorChatRoutes.post('/session', async (c) => {
  const body = await c.req.json();
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  
  const voice = (body.voice && VOICES[body.voice as DeepgramVoice]) 
    ? body.voice as DeepgramVoice 
    : 'aura-asteria-en';

  const config = {
    voice,
    professorName: body.professorName || 'AI Tutor',
    professorPersonality: body.professorPersonality || 'helpful and patient',
    topic: body.topic || 'General Learning',
    sectionTitle: body.sectionTitle || 'Introduction',
  };

  console.log(`Session created: ${sessionId}, voice: ${voice}, professor: ${config.professorName}`);

  const systemPrompt = buildSystemPrompt(config);
  
  sessions.set(sessionId, {
    history: [{ role: 'system', content: systemPrompt }],
    config,
  });

  return c.json({ sessionId, voice, ready: true });
});

// Update section context
editorChatRoutes.post('/session/:sessionId/section', async (c) => {
  const sessionId = c.req.param('sessionId');
  const session = sessions.get(sessionId);
  
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const body = await c.req.json();
  session.config.sectionTitle = body.sectionTitle || session.config.sectionTitle;
  
  // Update system prompt
  const newSystemPrompt = buildSystemPrompt(session.config);
  if (session.history.length > 0 && session.history[0].role === 'system') {
    session.history[0].content = newSystemPrompt;
  }

  return c.json({ success: true });
});

// Update notes content (for slash commands that need note context)
editorChatRoutes.post('/session/:sessionId/notes', async (c) => {
  const sessionId = c.req.param('sessionId');
  const session = sessions.get(sessionId);
  
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const body = await c.req.json();
  session.notesContent = body.notes || '';

  return c.json({ success: true });
});

// Send text message and get response
editorChatRoutes.post('/session/:sessionId/chat', async (c) => {
  const sessionId = c.req.param('sessionId');
  const session = sessions.get(sessionId);
  
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const body = await c.req.json();
  const userMessage = body.message?.trim();
  
  if (!userMessage) {
    return c.json({ error: 'Message required' }, 400);
  }

  // Check for slash command
  const slashCommand = parseSlashCommand(userMessage);
  if (slashCommand) {
    console.log(`Slash command detected: ${slashCommand.command}`, slashCommand.argument || '');
    
    try {
      const result = await executeSlashCommand(c.env, slashCommand, session.notesContent);
      
      // Add to history as command execution
      session.history.push({ role: 'user', content: `[Command: ${slashCommand.command}] ${slashCommand.argument || ''}` });
      session.history.push({ role: 'assistant', content: result.response });
      
      return c.json({
        response: result.response,
        isCommand: true,
        commandType: result.commandType,
        commandData: result.data,
        sessionId,
      });
    } catch (e) {
      console.error('Slash command error:', e);
      return c.json({ 
        response: `Sorry, I couldn't execute that command: ${e}`,
        isCommand: true,
        commandType: slashCommand.command,
        error: true,
      });
    }
  }

  // Normal chat flow
  // Add user message to history
  session.history.push({ role: 'user', content: userMessage });

  // Keep history manageable
  const recentHistory = session.history.length > 12
    ? [session.history[0], ...session.history.slice(-10)]
    : session.history;

  // Generate LLM response
  // @ts-expect-error - model exists in Workers AI
  const llmResult = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
    messages: recentHistory,
    max_tokens: 150,
    temperature: 0.7,
  }) as { response?: string };

  const response = llmResult.response?.trim() || "I didn't catch that. Could you try again?";
  
  // Add assistant response to history
  session.history.push({ role: 'assistant', content: response });

  return c.json({ 
    response,
    sessionId,
  });
});

// Send audio and get text + audio response
editorChatRoutes.post('/session/:sessionId/voice', async (c) => {
  const sessionId = c.req.param('sessionId');
  const session = sessions.get(sessionId);
  
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const formData = await c.req.formData();
  const audioFile = formData.get('audio') as File | null;
  
  if (!audioFile) {
    return c.json({ error: 'Audio required' }, 400);
  }

  try {
    // Get raw audio bytes
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);
    console.log(`Received ${audioBytes.length} bytes of audio`);

    // Speech-to-text - pass raw bytes directly
    const sttResult = await c.env.AI.run('@cf/openai/whisper', {
      audio: [...audioBytes],
    }) as { text?: string };

    const transcript = sttResult.text?.trim();
    if (!transcript) {
      return c.json({ error: 'Could not transcribe audio' }, 400);
    }
    
    console.log(`Transcript: "${transcript}"`);

    // Check for slash command in transcript
    const slashCommand = parseSlashCommand(transcript);
    
    let response: string;
    let responseForTTS: string;
    let isCommand = false;
    let commandType: string | undefined;
    let commandData: unknown;
    
    if (slashCommand) {
      console.log(`Voice slash command detected: ${slashCommand.command}`, slashCommand.argument || '');
      isCommand = true;
      commandType = slashCommand.command;
      
      try {
        const result = await executeSlashCommand(c.env, slashCommand, session.notesContent);
        response = result.response;
        responseForTTS = result.spokenResponse;
        commandData = result.data;
        
        // Add to history as command execution
        session.history.push({ role: 'user', content: `[Command: ${slashCommand.command}] ${slashCommand.argument || ''}` });
        session.history.push({ role: 'assistant', content: response });
      } catch (e) {
        console.error('Slash command error:', e);
        response = `Sorry, I couldn't execute that command.`;
        responseForTTS = response;
      }
    } else {
      // Normal chat flow
      session.history.push({ role: 'user', content: transcript });

      // Keep history manageable
      const recentHistory = session.history.length > 12
        ? [session.history[0], ...session.history.slice(-10)]
        : session.history;

      // Generate LLM response
      // @ts-expect-error - model exists in Workers AI
      const llmResult = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
        messages: recentHistory,
        max_tokens: 150,
        temperature: 0.7,
      }) as { response?: string };

      response = llmResult.response?.trim() || "I didn't catch that. Could you try again?";
      responseForTTS = response;
      
      // Add assistant response to history
      session.history.push({ role: 'assistant', content: response });
    }

    // Generate TTS (use spoken response which is shorter for commands)
    let responseAudioBase64: string | null = null;
    try {
      const speaker = getSpeakerName(session.config.voice);
      console.log(`TTS: Using speaker "${speaker}" for voice "${session.config.voice}"`);
      
      // Use returnRawResponse to get Response object with audio
      const ttsResponse = await c.env.AI.run('@cf/deepgram/aura-1' as Parameters<typeof c.env.AI.run>[0], {
        text: responseForTTS,
        speaker,
        encoding: 'mp3',
      }, { returnRawResponse: true }) as Response;
      
      const ttsAudioBuffer = await ttsResponse.arrayBuffer();
      const bytes = new Uint8Array(ttsAudioBuffer);
      
      if (bytes.length > 0) {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        responseAudioBase64 = btoa(binary);
        console.log(`TTS: Generated ${bytes.length} bytes of audio`);
      } else {
        console.error('TTS: Empty audio response');
      }
    } catch (ttsError) {
      console.error('TTS error (continuing without audio):', ttsError);
      // Continue without audio - don't fail the whole request
    }

    return c.json({
      transcript,
      response,
      audio: responseAudioBase64,
      audioFormat: 'mp3',
      isCommand,
      commandType,
      commandData,
    });

  } catch (e) {
    console.error('Voice processing error:', e);
    return c.json({ error: String(e) }, 500);
  }
});

// Clear history
editorChatRoutes.post('/session/:sessionId/clear', async (c) => {
  const sessionId = c.req.param('sessionId');
  const session = sessions.get(sessionId);
  
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // Keep only system prompt
  session.history = session.history.slice(0, 1);
  
  return c.json({ success: true });
});

// Summarize conversation for notes
editorChatRoutes.post('/session/:sessionId/summarize', async (c) => {
  const sessionId = c.req.param('sessionId');
  const session = sessions.get(sessionId);
  
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // Get conversation messages (excluding system prompt)
  const conversation = session.history
    .slice(1) // Skip system prompt
    .filter(msg => msg.role !== 'system')
    .map(msg => `${msg.role === 'user' ? 'Student' : session.config.professorName}: ${msg.content}`)
    .join('\n');
  
  if (!conversation.trim()) {
    return c.json({ summary: null, message: 'No conversation to summarize' });
  }

  try {
    // Use LLM to summarize
    // @ts-expect-error - model exists in Workers AI
    const result = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that summarizes learning conversations into concise study notes.
Create bullet points that capture the key concepts, questions answered, and important information discussed.
Keep it brief (3-5 bullet points max) and focused on what would be useful for studying.
Format as markdown bullet points.`,
        },
        {
          role: 'user',
          content: `Summarize this tutoring conversation into study notes:\n\n${conversation}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.5,
    }) as { response?: string };

    const summary = result.response?.trim() || null;
    
    return c.json({ 
      summary,
      messageCount: session.history.length - 1, // Exclude system prompt
    });
  } catch (e) {
    console.error('Summarize error:', e);
    return c.json({ error: String(e) }, 500);
  }
});

// Delete session
editorChatRoutes.delete('/session/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  sessions.delete(sessionId);
  return c.json({ success: true });
});

export { editorChatRoutes };
