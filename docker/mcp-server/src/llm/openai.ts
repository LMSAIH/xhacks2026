import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface TutorResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function generateTutorResponse(
  messages: ConversationMessage[],
  systemPrompt: string,
  courseContext: string,
  options: { model?: string; maxTokens?: number } = {}
): Promise<TutorResponse> {
  const { model = 'gpt-4o', maxTokens = 1024 } = options;
  
  const fullMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: `${systemPrompt}\n\nRelevant course material:\n${courseContext}` },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];
  
  const completion = await openai.chat.completions.create({
    model,
    messages: fullMessages,
    max_completion_tokens: maxTokens,
    temperature: 0.7,
  });
  
  const choice = completion.choices[0];
  
  return {
    content: choice.message.content || '',
    usage: {
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
    },
  };
}

export async function generateSummary(
  text: string,
  options: { model?: string; maxTokens?: number } = {}
): Promise<string> {
  const { model = 'gpt-4o-mini', maxTokens = 256 } = options;
  
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: `Summarize the following text concisely:\n\n${text}`,
      },
    ],
    max_completion_tokens: maxTokens,
    temperature: 0.3,
  });
  
  return completion.choices[0].message.content || '';
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  
  return response.data[0].embedding;
}
