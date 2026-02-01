import { describe, it, expect } from 'vitest';
import { 
  listPersonas, 
  getPersona, 
  PERSONAS 
} from '../src/tools/personas.js';

describe('Personas Module', () => {
  describe('listPersonas', () => {
    it('should return all personas with required properties', () => {
      const personas = listPersonas();
      
      expect(personas).toHaveLength(PERSONAS.length);
      expect(personas.length).toBeGreaterThan(0);
      
      personas.forEach(persona => {
        expect(persona).toHaveProperty('id');
        expect(persona).toHaveProperty('name');
        expect(persona).toHaveProperty('description');
      });
    });

    it('should include expected persona IDs', () => {
      const personas = listPersonas();
      const personaIds = personas.map(p => p.id);
      
      expect(personaIds).toContain('socratic');
      expect(personaIds).toContain('professor');
      expect(personaIds).toContain('mentor');
      expect(personaIds).toContain('tutor');
    });

    it('should have 4 personas', () => {
      expect(listPersonas()).toHaveLength(4);
    });
  });

  describe('getPersona', () => {
    it('should return socratic persona', () => {
      const persona = getPersona('socratic');
      
      expect(persona.id).toBe('socratic');
      expect(persona.name).toBe('Socratic Tutor');
      expect(persona.systemPrompt).toContain('guided question');
    });

    it('should return professor persona', () => {
      const persona = getPersona('professor');
      
      expect(persona.id).toBe('professor');
      expect(persona.name).toBe('Professor');
      expect(persona.systemPrompt).toContain('academic');
    });

    it('should return mentor persona', () => {
      const persona = getPersona('mentor');
      
      expect(persona.id).toBe('mentor');
      expect(persona.name).toBe('Friendly Mentor');
      expect(persona.systemPrompt).toContain('casual');
    });

    it('should return tutor persona as default', () => {
      const persona = getPersona('unknown' as any);
      
      expect(persona.id).toBe('tutor');
      expect(persona.name).toBe('Standard Tutor');
    });
  });

  describe('Persona System Prompts', () => {
    it('should have non-empty system prompts for all personas', () => {
      PERSONAS.forEach(persona => {
        expect(persona.systemPrompt.length).toBeGreaterThan(50);
      });
    });

    it('should have unique system prompts', () => {
      const prompts = PERSONAS.map(p => p.systemPrompt);
      const uniquePrompts = new Set(prompts);
      
      expect(uniquePrompts.size).toBe(prompts.length);
    });
  });
});
