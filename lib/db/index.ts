import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'app.db')
const db = new Database(dbPath)

// Enable foreign keys
db.pragma('foreign_keys = ON')

// Initialize schema
db.exec(`
  -- Sessions table
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    original_idea TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'complete', 'published')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    remix_of_session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL
  );

  -- Messages table
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Outputs table
  CREATE TABLE IF NOT EXISTS outputs (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    hooks TEXT NOT NULL DEFAULT '[]',
    hooks_original TEXT NOT NULL DEFAULT '[]',
    body_content TEXT NOT NULL DEFAULT '',
    body_content_original TEXT NOT NULL DEFAULT '',
    ctas TEXT NOT NULL DEFAULT '[]',
    ctas_original TEXT NOT NULL DEFAULT '[]',
    visual_concepts TEXT NOT NULL DEFAULT '[]',
    visual_concepts_original TEXT NOT NULL DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Favorites table
  CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('hook', 'cta', 'body', 'visual', 'template')),
    content TEXT NOT NULL,
    source_session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Performance notes table
  CREATE TABLE IF NOT EXISTS performance_notes (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    views INTEGER,
    likes INTEGER,
    comments INTEGER,
    reposts INTEGER,
    notes TEXT NOT NULL DEFAULT '',
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Create indexes for better query performance
  CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
  CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
  CREATE INDEX IF NOT EXISTS idx_favorites_type ON favorites(type);
`)

export default db
