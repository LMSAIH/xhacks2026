const CF_CONFIG = {
  accountId: process.env.CF_ACCOUNT_ID || '',
  apiToken: process.env.CF_API_TOKEN || '',
  aiSearchName: process.env.CF_AI_SEARCH_NAME || 'learnlm-rag',
  r2Bucket: process.env.CF_R2_BUCKET || 'learnlm-courses',
};

export interface AISearchResult {
  score: number;
  document: {
    course_code: string;
    title: string;
    content: string;
    section?: string;
    chunk_id: string;
  };
}

export interface CourseOutline {
  course_code: string;
  title: string;
  description: string;
  credits: number;
  department: string;
  instructor?: {
    name: string;
    rating: number;
  };
  outline: string;
}

// API response types
interface CFApiResponse<T> {
  success: boolean;
  result: T;
  errors?: Array<{ message: string }>;
}

interface AISearchQueryResult {
  data: Array<{
    _score?: number;
    course_code?: string;
    title?: string;
    content?: string;
    section?: string;
    chunk_id?: string;
  }>;
}

interface R2ListResult {
  objects?: Array<{
    key: string;
    size: number;
  }>;
}

async function cfFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_CONFIG.accountId}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${CF_CONFIG.apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  return response;
}

export async function searchCourseContent(
  query: string,
  options: { limit?: number; courseCode?: string } = {}
): Promise<AISearchResult[]> {
  const { limit = 5, courseCode } = options;
  
  // Build search query - include course code in query if specified
  const searchQuery = courseCode 
    ? `${courseCode} ${query}`.trim()
    : query;
  
  const body: Record<string, unknown> = {
    query: searchQuery,
    max_num_results: limit,
  };
  
  // Use the autorag/rags endpoint (AI Search REST API)
  const response = await cfFetch(`/autorag/rags/${CF_CONFIG.aiSearchName}/search`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI Search query failed: ${error}`);
  }
  
  const data = await response.json() as CFApiResponse<AISearchQueryResult>;
  
  if (!data.success) {
    throw new Error(`AI Search error: ${data.errors?.[0]?.message || 'Unknown error'}`);
  }
  
  return data.result.data.map((item) => ({
    score: item._score || 0,
    document: {
      course_code: item.course_code || '',
      title: item.title || '',
      content: item.content || '',
      section: item.section,
      chunk_id: item.chunk_id || '',
    },
  }));
}

export async function getCourseOutline(courseCode: string): Promise<CourseOutline | null> {
  const results = await searchCourseContent('', {
    limit: 1,
    courseCode,
  });
  
  if (results.length === 0) {
    return null;
  }
  
  const doc = results[0].document;
  
  return {
    course_code: doc.course_code,
    title: doc.title,
    description: '',
    credits: 0,
    department: '',
    outline: doc.content,
  };
}

export async function getInstructorInfo(instructorName: string): Promise<Record<string, unknown> | null> {
  const results = await searchCourseContent(`instructor ${instructorName}`, { limit: 3 });
  
  if (results.length === 0) {
    return null;
  }
  
  return {
    name: instructorName,
    courses: results.map(r => ({
      course_code: r.document.course_code,
      title: r.document.title,
      relevance: r.score,
    })),
  };
}

export async function listR2Objects(prefix = ''): Promise<Array<{ key: string; size: number }>> {
  const response = await cfFetch(`/r2/buckets/${CF_CONFIG.r2Bucket}/objects?prefix=${encodeURIComponent(prefix)}`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`R2 list failed: ${error}`);
  }
  
  const data = await response.json() as CFApiResponse<R2ListResult>;
  
  if (!data.success) {
    return [];
  }
  
  return (data.result.objects || []).map((obj) => ({
    key: obj.key,
    size: obj.size,
  }));
}

export async function getR2Object(key: string): Promise<string | null> {
  const response = await cfFetch(`/r2/buckets/${CF_CONFIG.r2Bucket}/objects/${encodeURIComponent(key)}`);
  
  if (!response.ok) {
    return null;
  }
  
  return response.text();
}
