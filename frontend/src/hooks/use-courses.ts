import { useState, useEffect, useCallback } from "react";
import { searchCourses, getCourseByName, getCourseById, type Course, type SearchParams } from "@/lib/api";

/**
 * Hook to search and manage courses from the backend
 */
export function useCourses(initialParams?: SearchParams) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (params: SearchParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      const results = await searchCourses(params);
      setCourses(results);
    } catch (err) {
      console.error("Failed to search courses:", err);
      setError("Failed to load courses");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial search on mount
  useEffect(() => {
    if (initialParams) {
      search(initialParams);
    }
  }, []);

  return {
    courses,
    loading,
    error,
    search,
    refresh: () => search(initialParams || {}),
  };
}

/**
 * Hook to fetch a single course by name
 */
export function useCourse(name: string | undefined) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) {
      setCourse(null);
      return;
    }

    async function fetchCourse() {
      if (!name) return;
      try {
        setLoading(true);
        setError(null);
        const result = await getCourseByName(name);
        setCourse(result);
      } catch (err) {
        console.error("Failed to fetch course:", err);
        setError("Failed to load course");
        setCourse(null);
      } finally {
        setLoading(false);
      }
    }

    fetchCourse();
  }, [name]);

  return { course, loading, error };
}

/**
 * Hook to fetch a single course by ID
 */
export function useCourseById(id: number | undefined) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id === undefined) {
      setCourse(null);
      return;
    }

    async function fetchCourse() {
      if (id === undefined) return;
      try {
        setLoading(true);
        setError(null);
        const result = await getCourseById(id);
        setCourse(result);
      } catch (err) {
        console.error("Failed to fetch course:", err);
        setError("Failed to load course");
        setCourse(null);
      } finally {
        setLoading(false);
      }
    }

    fetchCourse();
  }, [id]);

  return { course, loading, error };
}
