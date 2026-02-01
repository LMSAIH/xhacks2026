import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'learnlm.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema();
  }
  return db;
}

function initSchema(): void {
  const database = db as Database.Database;
  
  database.exec(`
    CREATE TABLE IF NOT EXISTS tutoring_sessions (
      id TEXT PRIMARY KEY,
      course_code TEXT NOT NULL,
      persona TEXT NOT NULL,
      voice_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS session_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES tutoring_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sfu_courses (
      id TEXT PRIMARY KEY,
      course_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      credits INTEGER,
      department TEXT,
      instructor_name TEXT,
      instructor_rating REAL,
      outline TEXT,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_course ON tutoring_sessions(course_code);
    CREATE INDEX IF NOT EXISTS idx_messages_session ON session_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_courses_code ON sfu_courses(course_code);
    CREATE INDEX IF NOT EXISTS idx_courses_dept ON sfu_courses(department);
  `);
}

export interface TutoringSession {
  id: string;
  course_code: string;
  persona: string;
  voice_id: string;
  created_at: string;
  updated_at: string;
  metadata: string;
}

export interface SessionMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface Course {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  credits: number | null;
  department: string | null;
  instructor_name: string | null;
  instructor_rating: number | null;
  outline: string | null;
  metadata: string;
}

export function createSession(
  courseCode: string,
  persona: string,
  voiceId: string,
  metadata: Record<string, unknown> = {}
): TutoringSession {
  const database = getDb();
  const id = uuidv4();
  
  database.prepare(`
    INSERT INTO tutoring_sessions (id, course_code, persona, voice_id, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, courseCode, persona, voiceId, JSON.stringify(metadata));
  
  return getSession(id)!;
}

export function getSession(sessionId: string): TutoringSession | null {
  const database = getDb();
  const result = database.prepare(`
    SELECT * FROM tutoring_sessions WHERE id = ?
  `).get(sessionId) as TutoringSession | undefined;
  
  return result || null;
}

export function endSession(sessionId: string): boolean {
  const database = getDb();
  const result = database.prepare(`
    DELETE FROM tutoring_sessions WHERE id = ?
  `).run(sessionId);
  
  return result.changes > 0;
}

export function addMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
): SessionMessage {
  const database = getDb();
  const id = uuidv4();
  
  database.prepare(`
    INSERT INTO session_messages (id, session_id, role, content)
    VALUES (?, ?, ?, ?)
  `).run(id, sessionId, role, content);
  
  database.prepare(`
    UPDATE tutoring_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(sessionId);
  
  return { id, session_id: sessionId, role, content, created_at: new Date().toISOString() };
}

export function getMessages(sessionId: string): SessionMessage[] {
  const database = getDb();
  return database.prepare(`
    SELECT * FROM session_messages WHERE session_id = ? ORDER BY created_at ASC
  `).all(sessionId) as SessionMessage[];
}

export function searchCourses(query: string, limit = 10): Course[] {
  const database = getDb();
  const searchPattern = `%${query}%`;
  
  return database.prepare(`
    SELECT * FROM sfu_courses
    WHERE course_code LIKE ? OR title LIKE ? OR description LIKE ? OR department LIKE ?
    ORDER BY course_code ASC
    LIMIT ?
  `).all(searchPattern, searchPattern, searchPattern, searchPattern, limit) as Course[];
}

export function getCourseByCode(courseCode: string): Course | null {
  const database = getDb();
  const result = database.prepare(`
    SELECT * FROM sfu_courses WHERE course_code = ?
  `).get(courseCode.toUpperCase()) as Course | undefined;
  
  return result || null;
}

export function upsertCourse(course: Omit<Course, 'id' | 'created_at' | 'updated_at'>): Course {
  const database = getDb();
  const id = uuidv4();
  
  database.prepare(`
    INSERT INTO sfu_courses (id, course_code, title, description, credits, department, instructor_name, instructor_rating, outline, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(course_code) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      credits = excluded.credits,
      department = excluded.department,
      instructor_name = excluded.instructor_name,
      instructor_rating = excluded.instructor_rating,
      outline = excluded.outline,
      metadata = excluded.metadata,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    id,
    course.course_code.toUpperCase(),
    course.title,
    course.description,
    course.credits,
    course.department,
    course.instructor_name,
    course.instructor_rating,
    course.outline,
    JSON.stringify(course.metadata)
  );
  
  return getCourseByCode(course.course_code)!;
}

export function getRecentSessions(limit = 10): TutoringSession[] {
  const database = getDb();
  return database.prepare(`
    SELECT * FROM tutoring_sessions ORDER BY updated_at DESC LIMIT ?
  `).all(limit) as TutoringSession[];
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
