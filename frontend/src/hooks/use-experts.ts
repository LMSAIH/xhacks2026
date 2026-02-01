import { useState, useEffect, useCallback } from 'react';
import { findExperts, findExpertsWithImages, generateExpertImages, type Expert } from '@/lib/api';

interface UseExpertsOptions {
  topic: string;
  count?: number;
  withImages?: boolean;
  enabled?: boolean;
}

interface UseExpertsResult {
  experts: Expert[];
  isLoading: boolean;
  isGeneratingImages: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  generateImages: () => Promise<void>;
}

/**
 * Hook to fetch AI-generated experts for a topic
 */
export function useExperts({
  topic,
  count = 6,
  withImages = false,
  enabled = true,
}: UseExpertsOptions): UseExpertsResult {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExperts = useCallback(async () => {
    if (!topic || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      let result: Expert[];
      
      if (withImages) {
        // Fetch experts with images in one call (slower but complete)
        result = await findExpertsWithImages(topic, count);
      } else {
        // Fetch experts without images (faster)
        result = await findExperts(topic, count);
      }

      if (result.length === 0) {
        setError('No experts found for this topic');
      } else {
        setExperts(result);
      }
    } catch (err) {
      setError('Failed to fetch experts');
      console.error('Error fetching experts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [topic, count, withImages, enabled]);

  // Generate images for existing experts (if fetched without images)
  const generateImages = useCallback(async () => {
    if (experts.length === 0) return;

    setIsGeneratingImages(true);

    try {
      const response = await generateExpertImages(
        experts.map((e) => ({
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
      }
    } catch (err) {
      console.error('Error generating images:', err);
    } finally {
      setIsGeneratingImages(false);
    }
  }, [experts]);

  useEffect(() => {
    fetchExperts();
  }, [fetchExperts]);

  return {
    experts,
    isLoading,
    isGeneratingImages,
    error,
    refetch: fetchExperts,
    generateImages,
  };
}
