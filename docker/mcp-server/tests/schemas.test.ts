import { describe, it, expect } from 'vitest';
import { ListVoicesSchema, GetVoiceForCourseSchema } from '../src/tools/voices.js';
import { ListPersonasSchema } from '../src/tools/personas.js';
import { SearchCoursesSchema, GetCourseOutlineSchema } from '../src/tools/courses.js';
import { GetInstructorInfoSchema } from '../src/tools/instructors.js';

describe('Tool Schemas', () => {
  describe('Voice Tool Schemas', () => {
    it('list_voices should have correct schema', () => {
      expect(ListVoicesSchema.name).toBe('list_voices');
      expect(ListVoicesSchema.description).toContain('TTS voices');
      expect(ListVoicesSchema.inputSchema.type).toBe('object');
    });

    it('get_voice_for_course should have correct schema', () => {
      expect(GetVoiceForCourseSchema.name).toBe('get_voice_for_course');
      expect(GetVoiceForCourseSchema.inputSchema.properties.courseCode).toBeDefined();
      expect(GetVoiceForCourseSchema.inputSchema.required).toContain('courseCode');
    });
  });

  describe('Persona Tool Schemas', () => {
    it('list_personas should have correct schema', () => {
      expect(ListPersonasSchema.name).toBe('list_personas');
      expect(ListPersonasSchema.description).toContain('personas');
      expect(ListPersonasSchema.inputSchema.type).toBe('object');
    });
  });

  describe('Course Tool Schemas', () => {
    it('search_courses should have correct schema', () => {
      expect(SearchCoursesSchema.name).toBe('search_courses');
      expect(SearchCoursesSchema.inputSchema.properties.query).toBeDefined();
      expect(SearchCoursesSchema.inputSchema.properties.limit).toBeDefined();
      expect(SearchCoursesSchema.inputSchema.required).toContain('query');
    });

    it('get_course_outline should have correct schema', () => {
      expect(GetCourseOutlineSchema.name).toBe('get_course_outline');
      expect(GetCourseOutlineSchema.inputSchema.properties.courseCode).toBeDefined();
      expect(GetCourseOutlineSchema.inputSchema.required).toContain('courseCode');
    });
  });

  describe('Instructor Tool Schemas', () => {
    it('get_instructor_info should have correct schema', () => {
      expect(GetInstructorInfoSchema.name).toBe('get_instructor_info');
      expect(GetInstructorInfoSchema.inputSchema.properties.name).toBeDefined();
      expect(GetInstructorInfoSchema.inputSchema.properties.courseCode).toBeDefined();
      expect(GetInstructorInfoSchema.inputSchema.required).toContain('name');
    });
  });

  describe('Schema Validation', () => {
    const allSchemas = [
      ListVoicesSchema,
      GetVoiceForCourseSchema,
      ListPersonasSchema,
      SearchCoursesSchema,
      GetCourseOutlineSchema,
      GetInstructorInfoSchema,
    ];

    it('all schemas should have name property', () => {
      allSchemas.forEach(schema => {
        expect(schema.name).toBeDefined();
        expect(typeof schema.name).toBe('string');
        expect(schema.name.length).toBeGreaterThan(0);
      });
    });

    it('all schemas should have description property', () => {
      allSchemas.forEach(schema => {
        expect(schema.description).toBeDefined();
        expect(typeof schema.description).toBe('string');
        expect(schema.description.length).toBeGreaterThan(10);
      });
    });

    it('all schemas should have valid inputSchema', () => {
      allSchemas.forEach(schema => {
        expect(schema.inputSchema).toBeDefined();
        expect(schema.inputSchema.type).toBe('object');
        expect(schema.inputSchema.properties).toBeDefined();
      });
    });

    it('all schema names should be snake_case', () => {
      allSchemas.forEach(schema => {
        expect(schema.name).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });
  });
});
