-- SFU AI Teacher Database Schema
-- D1 SQLite Database

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE,
  name TEXT,
  avatar_url TEXT,
  preferences TEXT DEFAULT '{}', -- JSON: voice, speed, etc.
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- SFU Courses Table (Cached Metadata)
-- ============================================
DROP TABLE IF EXISTS sfu_courses;
CREATE TABLE sfu_courses (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL UNIQUE,   -- Combined "DEPT NUMBER" e.g., "CMPT 225"
  title TEXT,                  -- Course title e.g., "Introduction to Computing Science"
  description TEXT,
  units TEXT,
  prerequisites TEXT,
  corequisites TEXT,
  notes TEXT,
  designation TEXT,
  delivery_method TEXT,
  degree_level TEXT,
  term TEXT,
  instructors TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_courses_name ON sfu_courses(name);

-- ============================================
-- SFU Outlines Table (Chunked Content for RAG)
-- ============================================
CREATE TABLE IF NOT EXISTS sfu_outlines (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  course_id TEXT NOT NULL REFERENCES sfu_courses(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content_type TEXT NOT NULL,          -- 'syllabus', 'schedule', 'grading', 'textbook', 'review', etc.
  content TEXT NOT NULL,               -- The actual text chunk
  metadata TEXT DEFAULT '{}',          -- JSON: section, week, etc.
  embedding_id TEXT,                   -- Reference to Vectorize vector ID
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(course_id, chunk_index, content_type)
);

CREATE INDEX IF NOT EXISTS idx_outlines_course ON sfu_outlines(course_id);
CREATE INDEX IF NOT EXISTS idx_outlines_type ON sfu_outlines(content_type);
CREATE INDEX IF NOT EXISTS idx_outlines_embedding ON sfu_outlines(embedding_id);

-- ============================================
-- Voice Sessions Table
-- ============================================
CREATE TABLE IF NOT EXISTS voice_sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  course_id TEXT REFERENCES sfu_courses(id) ON DELETE SET NULL,
  course_code TEXT,                    -- Denormalized for quick access
  status TEXT DEFAULT 'active',        -- 'active', 'paused', 'completed', 'error'
  topic TEXT,                          -- Current topic being discussed
  context TEXT DEFAULT '{}',           -- JSON: conversation context
  duration_seconds INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT,
  durable_object_id TEXT               -- Reference to DO instance
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_course ON voice_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON voice_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON voice_sessions(started_at);

-- ============================================
-- Transcripts Table
-- ============================================
CREATE TABLE IF NOT EXISTS transcripts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id TEXT NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,           -- Order in conversation
  role TEXT NOT NULL,                  -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  audio_duration_ms INTEGER,           -- Duration of audio segment
  confidence REAL,                     -- STT confidence score
  is_interruption INTEGER DEFAULT 0,   -- 1 if this was an interrupt
  is_clarification INTEGER DEFAULT 0,  -- 1 if this was a clarification request
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(session_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_transcripts_session ON transcripts(session_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_role ON transcripts(role);

-- ============================================
-- Progress Table (Learning Progress per Course)
-- ============================================
CREATE TABLE IF NOT EXISTS progress (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES sfu_courses(id) ON DELETE CASCADE,
  topics_covered TEXT DEFAULT '[]',    -- JSON array of topics
  questions_asked INTEGER DEFAULT 0,
  clarifications_requested INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  last_topic TEXT,
  mastery_score REAL DEFAULT 0,        -- 0-100 score
  notes TEXT,                          -- User notes or AI-generated summary
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_course ON progress(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_mastery ON progress(mastery_score);

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_progress_timestamp 
AFTER UPDATE ON progress
BEGIN
  UPDATE progress SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================
-- Sample Data for Development
-- ============================================
-- INSERT INTO users (id, email, name) VALUES 
--   ('dev-user-001', 'dev@sfu.ca', 'Dev User');
