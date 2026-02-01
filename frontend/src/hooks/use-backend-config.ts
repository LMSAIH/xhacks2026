import { useState, useEffect } from "react";
import { fetchConfig, fetchVoices, type BackendVoice, type BackendConfig } from "@/lib/api";
import { VOICES, type Voice } from "@/components/customize/data";

/**
 * Hook to fetch and manage backend configuration (voices, etc.)
 */
export function useBackendConfig() {
  const [config, setConfig] = useState<BackendConfig | null>(null);
  const [voices, setVoices] = useState<Voice[]>(VOICES); // Fallback to local voices
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        setError(null);

        const backendConfig = await fetchConfig();
        
        if (backendConfig && backendConfig.voices.length > 0) {
          setConfig(backendConfig);
          // Transform backend voices to match frontend Voice interface
          const transformedVoices: Voice[] = backendConfig.voices.map((v: BackendVoice) => ({
            id: v.id,
            name: v.name,
            description: v.style,
            personality: v.bestFor.join(", "),
            gender: v.gender,
            bestFor: v.bestFor,
          }));
          setVoices(transformedVoices);
        } else {
          // Fallback to local voices if backend is unavailable
          console.warn("Backend config unavailable, using local voices");
          setVoices(VOICES);
        }
      } catch (err) {
        console.error("Failed to load backend config:", err);
        setError("Failed to load configuration");
        // Keep using local voices as fallback
        setVoices(VOICES);
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  return {
    config,
    voices,
    defaultVoice: config?.defaultVoice || "aura-asteria-en",
    loading,
    error,
  };
}

/**
 * Hook to fetch voices only
 */
export function useVoices() {
  const [voices, setVoices] = useState<Voice[]>(VOICES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVoices() {
      try {
        setLoading(true);
        setError(null);

        const backendVoices = await fetchVoices();
        
        if (backendVoices.length > 0) {
          const transformedVoices: Voice[] = backendVoices.map((v: BackendVoice) => ({
            id: v.id,
            name: v.name,
            description: v.style,
            personality: v.bestFor.join(", "),
            gender: v.gender,
            bestFor: v.bestFor,
          }));
          setVoices(transformedVoices);
        } else {
          console.warn("No voices from backend, using local voices");
          setVoices(VOICES);
        }
      } catch (err) {
        console.error("Failed to load voices:", err);
        setError("Failed to load voices");
        setVoices(VOICES);
      } finally {
        setLoading(false);
      }
    }

    loadVoices();
  }, []);

  return { voices, loading, error };
}
