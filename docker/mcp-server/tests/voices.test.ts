import { describe, it, expect } from 'vitest';
import { 
  listVoices, 
  getVoice, 
  getRecommendedVoice, 
  getVoiceForCourse,
  VOICES 
} from '../src/tools/voices.js';

describe('Voices Module', () => {
  describe('listVoices', () => {
    it('should return all voices with required properties', () => {
      const voices = listVoices();
      
      expect(voices).toHaveLength(VOICES.length);
      expect(voices.length).toBeGreaterThan(0);
      
      voices.forEach(voice => {
        expect(voice).toHaveProperty('id');
        expect(voice).toHaveProperty('name');
        expect(voice).toHaveProperty('gender');
        expect(voice).toHaveProperty('style');
        expect(voice).toHaveProperty('best_for');
      });
    });

    it('should include expected voice IDs', () => {
      const voices = listVoices();
      const voiceIds = voices.map(v => v.id);
      
      expect(voiceIds).toContain('asteria');
      expect(voiceIds).toContain('orion');
      expect(voiceIds).toContain('neo');
    });
  });

  describe('getVoice', () => {
    it('should return correct voice by ID', () => {
      const voice = getVoice('neo');
      
      expect(voice.id).toBe('neo');
      expect(voice.name).toBe('Neo');
      expect(voice.style).toContain('calm');
    });

    it('should return default voice for unknown ID', () => {
      const voice = getVoice('unknown' as any);
      
      expect(voice.id).toBe('asteria');
    });
  });

  describe('getRecommendedVoice', () => {
    it('should recommend neo for CS courses', () => {
      expect(getRecommendedVoice('CS 1100')).toBe('neo');
      expect(getRecommendedVoice('cs101')).toBe('neo');
    });

    it('should recommend neo for CMPT courses', () => {
      expect(getRecommendedVoice('CMPT 120')).toBe('neo');
      expect(getRecommendedVoice('cmpt225')).toBe('neo');
    });

    it('should recommend athena for business courses', () => {
      expect(getRecommendedVoice('BUS 101')).toBe('athena');
      expect(getRecommendedVoice('BUSN 200')).toBe('athena');
    });

    it('should recommend angus for humanities', () => {
      expect(getRecommendedVoice('PHIL 101')).toBe('angus');
      expect(getRecommendedVoice('ENGL 100')).toBe('angus');
      expect(getRecommendedVoice('ART 101')).toBe('angus');
    });

    it('should recommend orion for sciences', () => {
      expect(getRecommendedVoice('PHYS 101')).toBe('orion');
      expect(getRecommendedVoice('CHEM 110')).toBe('orion');
      expect(getRecommendedVoice('BIO 101')).toBe('orion');
    });

    it('should return asteria as default', () => {
      expect(getRecommendedVoice('UNKNOWN 101')).toBe('asteria');
      expect(getRecommendedVoice('')).toBe('asteria');
    });
  });

  describe('getVoiceForCourse', () => {
    it('should return full voice details for course', () => {
      const result = getVoiceForCourse('CMPT 120');
      
      expect(result.course_code).toBe('CMPT 120');
      expect(result.recommended_voice.id).toBe('neo');
      expect(result.recommended_voice.name).toBe('Neo');
      expect(result.recommended_voice).toHaveProperty('style');
      expect(result.recommended_voice).toHaveProperty('best_for');
    });
  });
});
