/**
 * AI Tools Service - Workers AI implementations for slash commands
 * 
 * Fast path: Uses Cloudflare Workers AI (Llama 3.1) for low-latency responses
 * These run at the edge (~300-600ms) vs MCP server path (~2-5s)
 * 
 * All prompts use a tutor/teacher personality - never refers to itself as "AI"
 */

import type { Env } from '../types';
import { queryRagContext } from './rag';

// LLM Model to use
const LLM_MODEL = '@cf/meta/llama-3.1-8b-instruct';

// Types for structured critique
export interface NoteSuggestion {
  type: 'addition' | 'deletion' | 'modification' | 'comment';
  original?: string;      // Original text (for modifications/deletions)
  suggested?: string;     // Suggested replacement or addition
  reason: string;         // Brief explanation
  priority: 'high' | 'medium' | 'low';
  location?: string;      // Context hint for where this applies
}

export interface CritiqueResult {
  suggestions: NoteSuggestion[];
  overallFeedback: string;
  strengths: string[];
  score?: number;         // Optional 1-10 score
}

// System prompts for different tools - tutor personality, not generic AI
const SYSTEM_PROMPTS = {
  ask: `You are a knowledgeable and approachable university tutor helping students understand course material.
Speak naturally as a teacher would - warm, encouraging, and clear.
Never refer to yourself as "AI", "assistant", or "language model".
Answer questions directly and helpfully, using examples when useful.
If you're unsure about something, say "I'd need to double-check that" rather than disclaimers about being AI.
Keep responses focused and conversational.`,

  explain: `You are an experienced educator who excels at breaking down complex topics.
Speak as a patient teacher would - use analogies, examples, and build understanding step by step.
Never refer to yourself as "AI" or use phrases like "As an AI..."
Adjust your explanation based on the topic complexity.
Be encouraging and make the student feel capable of understanding.
Use markdown formatting for clarity when helpful.`,

  critique: `You are a supportive academic mentor reviewing a student's notes.
Provide constructive, specific feedback that helps them improve.
Never refer to yourself as "AI" - speak as a helpful teacher or TA would.

Focus your feedback on:
- **Accuracy**: Point out any errors or misconceptions gently
- **Completeness**: Suggest what might be missing
- **Organization**: How could the structure be improved?
- **Clarity**: Are explanations clear?

Be encouraging first, then offer specific improvements. End with a positive note about what they did well.`,

  critiqueDiff: `You are a supportive academic mentor reviewing a student's notes.
You MUST respond with valid JSON only - no other text.

Analyze the notes and return a JSON object with this exact structure:
{
  "suggestions": [
    {
      "type": "modification" | "addition" | "deletion" | "comment",
      "original": "text from their notes (for modification/deletion)",
      "suggested": "your suggested replacement or addition",
      "reason": "brief explanation (1 sentence)",
      "priority": "high" | "medium" | "low",
      "location": "context hint like 'in the definition section'"
    }
  ],
  "overallFeedback": "1-2 sentences of encouragement",
  "strengths": ["strength 1", "strength 2"],
  "score": 7
}

Rules:
- Keep suggestions specific and actionable
- Maximum 5 suggestions, prioritize the most important
- Be encouraging in feedback
- Score from 1-10 based on quality
- For "addition" type, original should be empty string
- For "deletion" type, suggested should be empty string`,

  quickCritique: `You are a tutor giving quick feedback on notes being written.
Keep your response to 1-2 short sentences. Be encouraging but note ONE specific thing that could be improved.
Never say "AI" - speak as a teacher glancing at a student's work.
If the notes look good, just give a brief encouraging comment.
Focus only on the most recent content.`,

  formulas: `You are a STEM tutor helping students with formulas and equations.
Present formulas clearly with explanations of when and how to use them.
Never refer to yourself as "AI" - speak as a knowledgeable tutor would.

For each formula:
- Write it clearly using LaTeX notation ($$formula$$ for display)
- Explain what each variable means
- Give a brief example of when to use it

Be practical and focus on what students actually need for problem-solving.`,

  suggest: `You are a knowledgeable tutor helping a student expand their notes.
Based on the current notes content and topic, suggest additional content that would be valuable to add.
Never refer to yourself as "AI" - speak as a helpful teacher.

Generate 2-4 paragraphs of suggested content that:
- Builds on what the student has already written
- Adds related concepts, examples, or explanations
- Uses clear, educational language
- Includes formulas in LaTeX ($$formula$$) if relevant

Format the suggestions as ready-to-add note content with markdown formatting.
Start directly with the content, don't preface it with "Here are some suggestions".`,
};

type ToolType = keyof typeof SYSTEM_PROMPTS;

interface AIToolOptions {
  courseCode?: string;
  context?: string;
  sessionId?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Run an AI tool with Workers AI
 */
async function runTool(
  env: Env,
  toolType: ToolType,
  prompt: string,
  options: AIToolOptions = {}
): Promise<string> {
  const systemPrompt = SYSTEM_PROMPTS[toolType];
  
  // Build context from RAG if sessionId is provided
  let ragContext = '';
  if (options.sessionId) {
    try {
      const chunks = await queryRagContext(env, options.sessionId, prompt, 3);
      if (chunks.length > 0) {
        ragContext = `\n\nRelevant course material:\n${chunks.join('\n\n')}`;
      }
    } catch (e) {
      console.error('RAG query failed:', e);
    }
  }

  // Build the full prompt
  let fullPrompt = prompt;
  if (options.courseCode) {
    fullPrompt = `[Course: ${options.courseCode}]\n\n${prompt}`;
  }
  if (options.context) {
    fullPrompt += `\n\nAdditional context: ${options.context}`;
  }
  if (options.difficulty) {
    fullPrompt += `\n\n(Adjust explanation for ${options.difficulty} level)`;
  }
  if (ragContext) {
    fullPrompt += ragContext;
  }

  // Call Workers AI
  // @ts-expect-error - model exists in Workers AI but not in local types
  const response = await env.AI.run(LLM_MODEL, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: fullPrompt },
    ],
    max_tokens: 1024,
  }) as { response?: string };

  return response.response || 'I wasn\'t able to generate a response. Could you try rephrasing your question?';
}

/**
 * Ask a question
 */
export async function askQuestion(
  env: Env,
  question: string,
  options: AIToolOptions = {}
): Promise<string> {
  return runTool(env, 'ask', question, options);
}

/**
 * Explain a concept
 */
export async function explainConcept(
  env: Env,
  concept: string,
  options: AIToolOptions = {}
): Promise<string> {
  const prompt = `Please explain: ${concept}`;
  return runTool(env, 'explain', prompt, options);
}

/**
 * Critique notes (prose format - legacy)
 */
export async function critiqueNotes(
  env: Env,
  notes: string,
  options: AIToolOptions = {}
): Promise<string> {
  const prompt = `Please review these notes and provide feedback:\n\n${notes}`;
  return runTool(env, 'critique', prompt, options);
}

/**
 * Critique notes with structured diff suggestions
 */
export async function critiqueNotesWithDiff(
  env: Env,
  notes: string,
  options: AIToolOptions = {}
): Promise<CritiqueResult> {
  const prompt = `Review these student notes and provide structured suggestions:\n\n${notes}`;
  const response = await runTool(env, 'critiqueDiff', prompt, options);
  
  // Try to parse JSON response
  try {
    // Find JSON in response (in case there's extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as CritiqueResult;
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse critique JSON:', e);
  }
  
  // Fallback: return as a comment suggestion
  return {
    suggestions: [{
      type: 'comment',
      reason: response.slice(0, 200),
      priority: 'medium',
    }],
    overallFeedback: 'Keep up the good work on your notes!',
    strengths: ['You\'re taking notes, which is great!'],
  };
}

/**
 * Quick background critique (for periodic checking)
 * Returns a short, encouraging comment with one suggestion
 */
export async function quickCritique(
  env: Env,
  notes: string,
  recentContent: string,
  options: AIToolOptions = {}
): Promise<string> {
  const prompt = `Recent notes being written:\n\n${recentContent}\n\nFull context:\n${notes.slice(-500)}`;
  return runTool(env, 'quickCritique', prompt, options);
}

/**
 * Get formulas for a topic
 */
export async function getFormulas(
  env: Env,
  topic: string,
  options: AIToolOptions = {}
): Promise<string> {
  const prompt = `What are the key formulas for: ${topic}`;
  return runTool(env, 'formulas', prompt, options);
}

/**
 * Suggest additional notes content based on current notes
 */
export async function suggestNotes(
  env: Env,
  currentNotes: string,
  options: AIToolOptions = {}
): Promise<string> {
  const prompt = currentNotes.trim().length > 10
    ? `Based on these current notes, suggest additional content to add:\n\n${currentNotes}`
    : `Generate some starter notes for a student. Include key concepts, definitions, and examples.`;
  return runTool(env, 'suggest', prompt, options);
}
