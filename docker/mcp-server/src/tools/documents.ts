import { searchCourseContent } from '../rag/cloudflare.js';
import { generateTutorResponse } from '../llm/openai.js';

// ============================================================================
// DOCUMENT-AWARE TOOLS
// These tools are designed for use with IDE integrations (Copilot, OpenCode, etc.)
// where users reference files like "@notes.md" and the agent passes file content.
// ============================================================================

// ============================================================================
// CRITIQUE DOCUMENT TOOL
// ============================================================================

export const CritiqueDocumentSchema = {
  name: 'critique_document',
  description: 'Critique and review a document (notes, essay, code documentation). For IDE use with file references like @filename. The agent should read the file and pass its content.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      content: {
        type: 'string' as const,
        description: 'The document content to critique (the agent should read the referenced file and pass its content here)',
      },
      filename: {
        type: 'string' as const,
        description: 'Original filename for context (e.g., "notes.md", "chapter1.txt")',
      },
      courseCode: {
        type: 'string' as const,
        description: 'Optional course code for academic context (e.g., "CMPT 120")',
      },
      focusAreas: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Areas to focus critique on: clarity, completeness, accuracy, structure, grammar, citations',
      },
      documentType: {
        type: 'string' as const,
        enum: ['notes', 'essay', 'code', 'documentation', 'report', 'other'],
        description: 'Type of document being critiqued',
        default: 'notes',
      },
    },
    required: ['content'],
  },
};

export interface CritiqueDocumentParams {
  content: string;
  filename?: string;
  courseCode?: string;
  focusAreas?: string[];
  documentType?: 'notes' | 'essay' | 'code' | 'documentation' | 'report' | 'other';
}

export async function critiqueDocument(params: CritiqueDocumentParams) {
  const {
    content,
    filename,
    courseCode,
    focusAreas = ['clarity', 'completeness', 'accuracy', 'structure'],
    documentType = 'notes',
  } = params;

  // Get course context if provided
  let courseContext = '';
  if (courseCode) {
    try {
      const results = await searchCourseContent(courseCode, { limit: 3 });
      if (results.length > 0) {
        courseContext = results.map(r => r.document.content).join('\n\n');
      }
    } catch {
      // Continue without context
    }
  }

  const documentTypePrompts: Record<string, string> = {
    notes: 'These are student notes. Evaluate for completeness of key concepts, clarity of explanations, and study-effectiveness.',
    essay: 'This is an academic essay. Evaluate for thesis clarity, argument structure, evidence usage, and writing quality.',
    code: 'This is code or code documentation. Evaluate for correctness, readability, documentation quality, and best practices.',
    documentation: 'This is technical documentation. Evaluate for accuracy, completeness, clarity, and usability.',
    report: 'This is a report. Evaluate for structure, data presentation, analysis quality, and conclusions.',
    other: 'Evaluate this document for overall quality, clarity, and effectiveness.',
  };

  const systemPrompt = `You are an expert academic reviewer providing constructive feedback.

${documentTypePrompts[documentType]}

Focus areas for this review: ${focusAreas.join(', ')}

Your critique should include:
1. **Strengths**: What's done well (2-3 points)
2. **Areas for Improvement**: Specific issues with examples from the text (3-5 points)
3. **Suggestions**: Actionable improvements the author can make
4. **Overall Assessment**: Brief summary and quality score (1-10)

Be specific - quote or reference exact parts of the document when making points.
Be constructive - focus on how to improve, not just what's wrong.`;

  const fileInfo = filename ? `Filename: ${filename}\n` : '';
  const courseInfo = courseCode ? `Course: ${courseCode}\n` : '';
  const userMessage = `${fileInfo}${courseInfo}\n---\n\n${content}`;

  try {
    const response = await generateTutorResponse(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      courseContext,
      { maxTokens: 2000 }
    );

    return {
      success: true,
      critique: response.content,
      filename: filename || null,
      courseCode: courseCode || null,
      documentType,
      focusAreas,
      usage: response.usage,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to critique document',
    };
  }
}

// ============================================================================
// SUGGEST DOCUMENT IMPROVEMENTS TOOL
// ============================================================================

export const SuggestDocumentSchema = {
  name: 'suggest_document',
  description: 'Suggest specific improvements for a document. Returns actionable suggestions that can be applied directly. For IDE use with file references.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      content: {
        type: 'string' as const,
        description: 'The document content to improve',
      },
      filename: {
        type: 'string' as const,
        description: 'Original filename for context',
      },
      courseCode: {
        type: 'string' as const,
        description: 'Course code for academic context and RAG lookup',
      },
      improvementType: {
        type: 'string' as const,
        enum: ['expand', 'clarify', 'restructure', 'add_examples', 'fix_errors', 'all'],
        description: 'Type of improvements to suggest',
        default: 'all',
      },
      section: {
        type: 'string' as const,
        description: 'Specific section or topic to focus improvements on',
      },
    },
    required: ['content'],
  },
};

export interface SuggestDocumentParams {
  content: string;
  filename?: string;
  courseCode?: string;
  improvementType?: 'expand' | 'clarify' | 'restructure' | 'add_examples' | 'fix_errors' | 'all';
  section?: string;
}

export async function suggestDocument(params: SuggestDocumentParams) {
  const {
    content,
    filename,
    courseCode,
    improvementType = 'all',
    section,
  } = params;

  // Get course context for better suggestions
  let courseContext = '';
  if (courseCode) {
    const searchQuery = section ? `${courseCode} ${section}` : courseCode;
    try {
      const results = await searchCourseContent(searchQuery, { limit: 5 });
      if (results.length > 0) {
        courseContext = results.map(r => r.document.content).join('\n\n');
      }
    } catch {
      // Continue without context
    }
  }

  const improvementPrompts: Record<string, string> = {
    expand: 'Focus on adding missing content, elaborating on brief points, and filling gaps.',
    clarify: 'Focus on making explanations clearer, simplifying complex sentences, and improving readability.',
    restructure: 'Focus on improving organization, adding headings, and improving flow between sections.',
    add_examples: 'Focus on adding practical examples, use cases, and illustrations of concepts.',
    fix_errors: 'Focus on correcting factual errors, typos, and inconsistencies.',
    all: 'Consider all types of improvements: content, clarity, structure, examples, and corrections.',
  };

  const systemPrompt = `You are an expert editor helping improve a document.
${courseCode ? `This document is for course ${courseCode}.` : ''}

${improvementPrompts[improvementType]}

Provide suggestions in this format:

## Suggested Additions
Specific content that should be added, with exact text that can be inserted.

## Suggested Changes
For each change:
- **Location**: Where in the document
- **Current**: The existing text (quote it)
- **Suggested**: The improved version
- **Reason**: Why this improves the document

## Missing Topics
${courseCode ? 'Based on the course content, these topics should be covered:' : 'These important topics appear to be missing:'}
- List each missing topic with a brief explanation

Make suggestions specific and actionable - the user should be able to copy and apply them directly.`;

  const fileInfo = filename ? `Filename: ${filename}\n` : '';
  const sectionInfo = section ? `Focus Section: ${section}\n` : '';
  const userMessage = `${fileInfo}${sectionInfo}\n---\n\n${content}`;

  try {
    const response = await generateTutorResponse(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      courseContext,
      { maxTokens: 2000 }
    );

    return {
      success: true,
      suggestions: response.content,
      filename: filename || null,
      courseCode: courseCode || null,
      improvementType,
      section: section || null,
      hasContext: courseContext.length > 0,
      usage: response.usage,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate suggestions',
    };
  }
}

// ============================================================================
// ASK ABOUT DOCUMENT TOOL
// ============================================================================

export const AskDocumentSchema = {
  name: 'ask_document',
  description: 'Ask a question about a document. The AI will answer based on the document content and optionally course knowledge. For IDE use with file references.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      content: {
        type: 'string' as const,
        description: 'The document content to ask about',
      },
      question: {
        type: 'string' as const,
        description: 'The question to ask about the document',
      },
      filename: {
        type: 'string' as const,
        description: 'Original filename for context',
      },
      courseCode: {
        type: 'string' as const,
        description: 'Course code for additional academic context',
      },
      answerStyle: {
        type: 'string' as const,
        enum: ['concise', 'detailed', 'socratic'],
        description: 'Style of answer: concise (brief), detailed (comprehensive), socratic (guiding questions)',
        default: 'detailed',
      },
    },
    required: ['content', 'question'],
  },
};

export interface AskDocumentParams {
  content: string;
  question: string;
  filename?: string;
  courseCode?: string;
  answerStyle?: 'concise' | 'detailed' | 'socratic';
}

export async function askDocument(params: AskDocumentParams) {
  const {
    content,
    question,
    filename,
    courseCode,
    answerStyle = 'detailed',
  } = params;

  // Get course context for better answers
  let courseContext = '';
  if (courseCode) {
    try {
      const results = await searchCourseContent(`${courseCode} ${question}`, { limit: 3 });
      if (results.length > 0) {
        courseContext = results.map(r => r.document.content).join('\n\n');
      }
    } catch {
      // Continue without context
    }
  }

  const stylePrompts: Record<string, string> = {
    concise: 'Provide a brief, direct answer in 2-3 sentences.',
    detailed: 'Provide a comprehensive answer with explanations and examples where helpful.',
    socratic: 'Instead of answering directly, guide the student to discover the answer through thoughtful questions. Help them think through the problem.',
  };

  const systemPrompt = `You are an expert tutor helping a student understand their document.

${stylePrompts[answerStyle]}

The student has a document they're working with${filename ? ` (${filename})` : ''}${courseCode ? ` for course ${courseCode}` : ''}.
Answer their question based on:
1. The document content provided
2. ${courseCode ? 'The course knowledge base (if relevant)' : 'Your general knowledge'}

If the answer cannot be found in the document, say so clearly and provide guidance on where to look or what to add.`;

  const fileInfo = filename ? `Document: ${filename}\n` : '';
  const userMessage = `${fileInfo}\n---\nDocument Content:\n${content}\n---\n\nQuestion: ${question}`;

  try {
    const response = await generateTutorResponse(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      courseContext,
      { maxTokens: answerStyle === 'concise' ? 500 : 1500 }
    );

    return {
      success: true,
      answer: response.content,
      question,
      filename: filename || null,
      courseCode: courseCode || null,
      answerStyle,
      hasContext: courseContext.length > 0,
      usage: response.usage,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to answer question',
    };
  }
}

// ============================================================================
// SUMMARIZE DOCUMENT TOOL
// ============================================================================

export const SummarizeDocumentSchema = {
  name: 'summarize_document',
  description: 'Summarize a document into key points. Useful for creating study guides or quick references from notes.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      content: {
        type: 'string' as const,
        description: 'The document content to summarize',
      },
      filename: {
        type: 'string' as const,
        description: 'Original filename for context',
      },
      summaryType: {
        type: 'string' as const,
        enum: ['bullet_points', 'paragraph', 'outline', 'flashcards'],
        description: 'Format of the summary',
        default: 'bullet_points',
      },
      maxLength: {
        type: 'string' as const,
        enum: ['short', 'medium', 'long'],
        description: 'Desired length: short (~100 words), medium (~300 words), long (~500 words)',
        default: 'medium',
      },
      focusTopic: {
        type: 'string' as const,
        description: 'Optional specific topic to focus the summary on',
      },
    },
    required: ['content'],
  },
};

export interface SummarizeDocumentParams {
  content: string;
  filename?: string;
  summaryType?: 'bullet_points' | 'paragraph' | 'outline' | 'flashcards';
  maxLength?: 'short' | 'medium' | 'long';
  focusTopic?: string;
}

export async function summarizeDocument(params: SummarizeDocumentParams) {
  const {
    content,
    filename,
    summaryType = 'bullet_points',
    maxLength = 'medium',
    focusTopic,
  } = params;

  const lengthTargets: Record<string, string> = {
    short: 'Keep the summary to approximately 100 words or 5-7 bullet points.',
    medium: 'Keep the summary to approximately 300 words or 10-15 bullet points.',
    long: 'Keep the summary to approximately 500 words or 15-25 bullet points.',
  };

  const formatInstructions: Record<string, string> = {
    bullet_points: 'Format as a bulleted list with main points and sub-points where needed.',
    paragraph: 'Format as cohesive paragraphs with clear topic sentences.',
    outline: 'Format as a hierarchical outline with numbered sections (1, 1.1, 1.2, 2, etc.).',
    flashcards: 'Format as Q&A flashcard pairs:\n**Q:** [Question about a key concept]\n**A:** [Concise answer]',
  };

  const systemPrompt = `You are an expert at summarizing academic content.

${formatInstructions[summaryType]}
${lengthTargets[maxLength]}
${focusTopic ? `Focus specifically on: ${focusTopic}` : 'Cover all main topics in the document.'}

Extract the most important information:
- Key concepts and definitions
- Main arguments or findings
- Important relationships between ideas
- Critical details students need to remember

Make the summary useful for studying and review.`;

  const fileInfo = filename ? `Summarizing: ${filename}\n\n` : '';
  const userMessage = `${fileInfo}${content}`;

  try {
    const response = await generateTutorResponse(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      '',
      { maxTokens: maxLength === 'long' ? 1200 : maxLength === 'medium' ? 800 : 400 }
    );

    return {
      success: true,
      summary: response.content,
      filename: filename || null,
      summaryType,
      maxLength,
      focusTopic: focusTopic || null,
      usage: response.usage,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to summarize document',
    };
  }
}
