/**
 * Onboarding Pipeline Hook
 * 
 * Optimizes the onboarding flow by running expensive operations in parallel:
 * - Experts discovery (fast LLM call)
 * - Expert image generation (slow image gen - runs in background)
 * - Course outline generation (moderate LLM call)
 * 
 * All three start simultaneously when a topic is set, so by the time
 * the user finishes selecting a character and voice, the outline is ready.
 */

import { useState, useCallback, useRef } from 'react';
import { 
  findExperts, 
  generateExpertImages, 
  generateOutline,
  generateOutlineStreaming,
  type Expert,
  type GeneratedOutline,
  type OutlineItem,
} from '@/lib/api';

export interface OnboardingState {
  // Topic
  topic: string | null;
  
  // Experts
  experts: Expert[];
  isLoadingExperts: boolean;
  expertsError: string | null;
  
  // Images (progressive)
  isGeneratingImages: boolean;
  imagesReady: boolean;
  
  // Outline (with streaming support)
  outline: GeneratedOutline | null;
  streamingSections: OutlineItem[];
  isLoadingOutline: boolean;
  isStreamingOutline: boolean;
  outlineError: string | null;
  outlineProgress: { current: number; total: number } | null;
  
  // Overall
  isReady: boolean; // True when experts + outline are ready
}

interface UseOnboardingPipelineOptions {
  enabled?: boolean;
}

interface UseOnboardingPipelineReturn extends OnboardingState {
  setTopic: (topic: string) => void;
  reset: () => void;
  regenerateOutline: (characterInfo?: { id: string; name: string; teachingStyle?: string }) => Promise<void>;
  retryImages: () => Promise<void>;
}

export function useOnboardingPipeline(
  options: UseOnboardingPipelineOptions = {}
): UseOnboardingPipelineReturn {
  const { enabled = true } = options;
  
  // Topic state
  const [topic, setTopicState] = useState<string | null>(null);
  
  // Experts state
  const [experts, setExperts] = useState<Expert[]>([]);
  const [isLoadingExperts, setIsLoadingExperts] = useState(false);
  const [expertsError, setExpertsError] = useState<string | null>(null);
  
  // Images state (progressive loading)
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  
  // Outline state
  const [outline, setOutline] = useState<GeneratedOutline | null>(null);
  const [streamingSections, setStreamingSections] = useState<OutlineItem[]>([]);
  const [isLoadingOutline, setIsLoadingOutline] = useState(false);
  const [isStreamingOutline, setIsStreamingOutline] = useState(false);
  const [outlineError, setOutlineError] = useState<string | null>(null);
  const [outlineProgress, setOutlineProgress] = useState<{ current: number; total: number } | null>(null);
  
  // Track if pipeline has started for current topic
  const pipelineStartedRef = useRef<string | null>(null);
  
  // Fetch experts (fast - no images)
  const fetchExperts = useCallback(async (topicName: string) => {
    setIsLoadingExperts(true);
    setExpertsError(null);
    
    try {
      const result = await findExperts(topicName, 6);
      if (result.length === 0) {
        setExpertsError('No experts found for this topic');
      } else {
        setExperts(result);
      }
      return result;
    } catch (err) {
      setExpertsError('Failed to fetch experts');
      console.error('Error fetching experts:', err);
      return [];
    } finally {
      setIsLoadingExperts(false);
    }
  }, []);
  
  // Generate images for experts (background - slow)
  const generateImages = useCallback(async (expertList: Expert[]) => {
    if (expertList.length === 0) return;
    
    setIsGeneratingImages(true);
    
    try {
      const response = await generateExpertImages(
        expertList.map((e) => ({
          id: e.id,
          name: e.name,
          title: e.title,
          era: e.era,
        }))
      );
      
      if (response.success && response.images) {
        // Merge images into experts
        setExperts((prev) =>
          prev.map((expert) => {
            const imageData = response.images?.find((img) => img.id === expert.id);
            if (imageData?.image) {
              return { ...expert, image: imageData.image };
            }
            return expert;
          })
        );
        setImagesReady(true);
      }
    } catch (err) {
      console.error('Error generating images:', err);
      // Don't set error - images are optional
    } finally {
      setIsGeneratingImages(false);
    }
  }, []);
  
  // Fetch outline with streaming support
  const fetchOutline = useCallback(async (topicName: string, characterInfo?: { id: string; name: string; teachingStyle?: string }, useStreaming = true) => {
    setIsLoadingOutline(true);
    setOutlineError(null);
    setStreamingSections([]);
    setOutlineProgress(null);
    
    if (useStreaming) {
      setIsStreamingOutline(true);
      
      return new Promise<GeneratedOutline | null>((resolve) => {
        const sections: OutlineItem[] = [];
        let metadata: {
          learningObjectives: string[];
          estimatedDuration: string;
          difficulty: string;
        } | null = null;
        
        generateOutlineStreaming(
          topicName,
          {
            onSection: (section, index, total) => {
              sections.push(section);
              setStreamingSections([...sections]);
              setOutlineProgress({ current: index + 1, total });
            },
            onMetadata: (data) => {
              metadata = data;
            },
            onComplete: (data) => {
              const completeOutline: GeneratedOutline = {
                id: data.id,
                topic: data.topic,
                sections,
                learningObjectives: metadata?.learningObjectives || [],
                estimatedDuration: metadata?.estimatedDuration || '2 hours',
                difficulty: (metadata?.difficulty as 'beginner' | 'intermediate' | 'advanced') || 'intermediate',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              setOutline(completeOutline);
              setIsLoadingOutline(false);
              setIsStreamingOutline(false);
              setOutlineProgress(null);
              resolve(completeOutline);
            },
            onError: (error) => {
              setOutlineError(error);
              setIsLoadingOutline(false);
              setIsStreamingOutline(false);
              resolve(null);
            },
          },
          characterInfo
        );
      });
    } else {
      // Non-streaming fallback
      try {
        const result = await generateOutline(topicName, characterInfo);
        if (result) {
          setOutline(result);
        } else {
          setOutlineError('Failed to generate outline');
        }
        return result;
      } catch (err) {
        setOutlineError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error generating outline:', err);
        return null;
      } finally {
        setIsLoadingOutline(false);
      }
    }
  }, []);
  
  // Start the parallel pipeline
  const startPipeline = useCallback(async (topicName: string) => {
    if (!enabled || pipelineStartedRef.current === topicName) return;
    
    console.log(`[Pipeline] Starting for topic: ${topicName}`);
    pipelineStartedRef.current = topicName;
    
    // Start all three operations in parallel
    const expertsPromise = fetchExperts(topicName);
    const outlinePromise = fetchOutline(topicName);
    
    // Wait for experts, then start image generation in background
    expertsPromise.then((expertList) => {
      if (expertList.length > 0) {
        // Don't await - let it run in background
        generateImages(expertList);
      }
    });
    
    // Await both main operations
    await Promise.all([expertsPromise, outlinePromise]);
    
    console.log('[Pipeline] Initial fetch complete');
  }, [enabled, fetchExperts, fetchOutline, generateImages]);
  
  // Set topic and start pipeline
  const setTopic = useCallback((newTopic: string) => {
    if (newTopic === topic) return;
    
    setTopicState(newTopic);
    startPipeline(newTopic);
  }, [topic, startPipeline]);
  
  // Reset the pipeline
  const reset = useCallback(() => {
    setTopicState(null);
    setExperts([]);
    setIsLoadingExperts(false);
    setExpertsError(null);
    setIsGeneratingImages(false);
    setImagesReady(false);
    setOutline(null);
    setStreamingSections([]);
    setIsLoadingOutline(false);
    setIsStreamingOutline(false);
    setOutlineError(null);
    setOutlineProgress(null);
    pipelineStartedRef.current = null;
  }, []);
  
  // Regenerate outline with character info (called when user selects a character)
  const regenerateOutline = useCallback(async (characterInfo?: { id: string; name: string; teachingStyle?: string }) => {
    if (!topic) return;
    await fetchOutline(topic, characterInfo);
  }, [topic, fetchOutline]);
  
  // Retry image generation
  const retryImages = useCallback(async () => {
    if (experts.length > 0 && !isGeneratingImages) {
      await generateImages(experts);
    }
  }, [experts, isGeneratingImages, generateImages]);
  
  // Computed state
  const isReady = experts.length > 0 && outline !== null;
  
  return {
    // State
    topic,
    experts,
    isLoadingExperts,
    expertsError,
    isGeneratingImages,
    imagesReady,
    outline,
    streamingSections,
    isLoadingOutline,
    isStreamingOutline,
    outlineError,
    outlineProgress,
    isReady,
    
    // Actions
    setTopic,
    reset,
    regenerateOutline,
    retryImages,
  };
}
