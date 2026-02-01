import type { Env, CourseOutline, TextChunk, RagContext } from '../types';

// Embedding model to use
const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';

// Max chunk size for embedding
const MAX_CHUNK_SIZE = 512;

// Type for embedding response from Workers AI
interface EmbeddingResponse {
  shape: number[];
  data: number[][];
}

/**
 * Generate RAG context from course outline
 * Chunks the outline, generates embeddings, and stores in Vectorize
 */
export async function generateRagContext(
  env: Env,
  courseCode: string,
  sessionId: string,
  outline: CourseOutline
): Promise<RagContext> {
  // Create text chunks from outline
  const chunks = createChunksFromOutline(courseCode, outline);

  // Generate embeddings and store in Vectorize
  const vectorizeRef = await indexInVectorize(env, courseCode, sessionId, chunks);

  return {
    chunks,
    chunkCount: chunks.length,
    vectorizeRef,
  };
}

/**
 * Create text chunks from course outline
 */
function createChunksFromOutline(courseCode: string, outline: CourseOutline): TextChunk[] {
  const chunks: TextChunk[] = [];
  let chunkIndex = 0;

  // Chunk summary
  if (outline.summary) {
    const summaryChunks = splitTextIntoChunks(outline.summary, MAX_CHUNK_SIZE);
    for (const text of summaryChunks) {
      chunks.push({
        text,
        metadata: {
          source: 'summary',
          topic: courseCode,
          chunkIndex: chunkIndex++,
        },
      });
    }
  }

  // Chunk topics
  for (const topic of outline.topics) {
    chunks.push({
      text: `Topic: ${topic}`,
      metadata: {
        source: 'topic',
        topic,
        chunkIndex: chunkIndex++,
      },
    });
  }

  // Chunk learning objectives
  for (const objective of outline.learningObjectives) {
    chunks.push({
      text: `Learning Objective: ${objective}`,
      metadata: {
        source: 'learning_objective',
        topic: objective,
        chunkIndex: chunkIndex++,
      },
    });
  }

  // Chunk course topics
  for (const courseTopic of outline.courseTopics) {
    chunks.push({
      text: `Course Topic: ${courseTopic}`,
      metadata: {
        source: 'course_topic',
        topic: courseTopic,
        chunkIndex: chunkIndex++,
      },
    });
  }

  return chunks;
}

/**
 * Split text into smaller chunks
 */
function splitTextIntoChunks(text: string, maxSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  let currentChunk = '';
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length + 1 > maxSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = trimmedSentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

/**
 * Index chunks in Vectorize
 */
async function indexInVectorize(
  env: Env,
  courseCode: string,
  sessionId: string,
  chunks: TextChunk[]
): Promise<string> {
  const vectorizeRef = `session:${sessionId}`;

  // Generate embeddings for all chunks using Workers AI
  const texts = chunks.map((c) => c.text);

  try {
    const embeddingResponse = await env.AI.run(EMBEDDING_MODEL, {
      text: texts,
    }) as EmbeddingResponse;

    // Prepare vectors for Vectorize
    const vectors = chunks.map((chunk, index) => ({
      id: `${sessionId}-${chunk.metadata.chunkIndex}`,
      values: embeddingResponse.data[index],
      metadata: {
        courseCode,
        sessionId,
        source: chunk.metadata.source,
        topic: chunk.metadata.topic || '',
        text: chunk.text,
      },
    }));

    // Insert vectors into Vectorize
    await env.VECTORIZE.insert(vectors);

    return vectorizeRef;
  } catch (error) {
    console.error('Error indexing in Vectorize:', error);
    throw error;
  }
}

/**
 * Query Vectorize for relevant context during conversation
 */
export async function queryRagContext(
  env: Env,
  sessionId: string,
  query: string,
  topK: number = 5
): Promise<string[]> {
  try {
    // Generate embedding for query
    const embeddingResponse = await env.AI.run(EMBEDDING_MODEL, {
      text: [query],
    }) as EmbeddingResponse;

    const queryVector = embeddingResponse.data[0];

    // Query Vectorize with metadata filter for this session
    const results = await env.VECTORIZE.query(queryVector, {
      topK,
      filter: {
        sessionId: sessionId,
      },
      returnMetadata: 'all',
    });

    // Extract text from results
    return results.matches
      .filter((match) => match.metadata?.text)
      .map((match) => match.metadata!.text as string);
  } catch (error) {
    console.error('Error querying Vectorize:', error);
    return [];
  }
}

/**
 * Delete vectors for a session (cleanup)
 */
export async function deleteSessionVectors(
  env: Env,
  sessionId: string
): Promise<void> {
  try {
    // Vectorize doesn't have a bulk delete by metadata filter yet
    // We would need to track vector IDs and delete them individually
    // For now, this is a placeholder
    console.log(`Would delete vectors for session: ${sessionId}`);
  } catch (error) {
    console.error('Error deleting session vectors:', error);
  }
}

/**
 * Generate RAG context with additional web search results
 * Combines SFU course materials with web search for supplementary content
 */
export async function generateComprehensiveRag(
  env: Env,
  courseCode: string,
  sessionId: string,
  outline: CourseOutline
): Promise<RagContext> {
  // Start with outline-based RAG
  const baseContext = await generateRagContext(env, courseCode, sessionId, outline);

  // TODO: Add web search for supplementary content
  // This would involve:
  // 1. Searching for courseCode + topics
  // 2. Chunking web results
  // 3. Adding to Vectorize with source: 'web'

  return baseContext;
}
