/**
 * useMCP - Hook for calling MCP tools from frontend
 */

import { useState, useCallback } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';

export interface MCPResponse {
  response?: string;
  imageUrl?: string;
  description?: string;
  error?: string;
}

export interface UseMCPReturn {
  isLoading: boolean;
  error: string | null;
  
  // Tool methods
  ask: (question: string, options?: { courseCode?: string; context?: string }) => Promise<string>;
  explain: (concept: string, options?: { courseCode?: string; difficulty?: string }) => Promise<string>;
  critique: (notes: string, options?: { courseCode?: string; topic?: string }) => Promise<string>;
  getFormulas: (topic: string, options?: { courseCode?: string }) => Promise<string>;
  generateDiagram: (concept: string, options?: { style?: string }) => Promise<{ imageUrl?: string; description: string }>;
  chat: (message: string, options?: { courseCode?: string; sectionTitle?: string }) => Promise<string>;
  
  // Generic call
  callTool: (tool: string, args: Record<string, unknown>) => Promise<MCPResponse>;
}

export function useMCP(): UseMCPReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callTool = useCallback(async (tool: string, args: Record<string, unknown>): Promise<MCPResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, args }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.result || {};
    } catch (e) {
      const errorMsg = String(e);
      setError(errorMsg);
      return { error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const ask = useCallback(async (
    question: string, 
    options?: { courseCode?: string; context?: string }
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, ...options }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.response || 'No response';
    } catch (e) {
      const errorMsg = String(e);
      setError(errorMsg);
      return `Error: ${errorMsg}`;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const explain = useCallback(async (
    concept: string,
    options?: { courseCode?: string; difficulty?: string }
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, ...options }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.response || 'No explanation available';
    } catch (e) {
      const errorMsg = String(e);
      setError(errorMsg);
      return `Error: ${errorMsg}`;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const critique = useCallback(async (
    notes: string,
    options?: { courseCode?: string; topic?: string }
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/critique`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, ...options }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.response || 'No critique available';
    } catch (e) {
      const errorMsg = String(e);
      setError(errorMsg);
      return `Error: ${errorMsg}`;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getFormulas = useCallback(async (
    topic: string,
    options?: { courseCode?: string }
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/formulas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, ...options }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.response || 'No formulas found';
    } catch (e) {
      const errorMsg = String(e);
      setError(errorMsg);
      return `Error: ${errorMsg}`;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateDiagram = useCallback(async (
    concept: string,
    options?: { style?: string }
  ): Promise<{ imageUrl?: string; description: string }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/diagram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, ...options }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return {
        imageUrl: data.imageUrl,
        description: data.description || 'Diagram generated',
      };
    } catch (e) {
      const errorMsg = String(e);
      setError(errorMsg);
      return { description: `Error: ${errorMsg}` };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const chat = useCallback(async (
    message: string,
    options?: { courseCode?: string; sectionTitle?: string }
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/mcp/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, ...options }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.response || 'No response';
    } catch (e) {
      const errorMsg = String(e);
      setError(errorMsg);
      return `Error: ${errorMsg}`;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    ask,
    explain,
    critique,
    getFormulas,
    generateDiagram,
    chat,
    callTool,
  };
}
